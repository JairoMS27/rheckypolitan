import { supabase } from "@/integrations/supabase/client";
import { normalizeUsername } from "@/lib/username";

export type PublicProfile = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

export type ProfileSnippet = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
};

/** Batch-load public profile snippets by user id. */
export async function fetchProfileSnippets(
  userIds: string[],
): Promise<Map<string, ProfileSnippet>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, ProfileSnippet>();
  if (unique.length === 0) return map;

  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url")
    .in("id", unique);

  for (const row of data ?? []) {
    map.set(row.id, {
      id: row.id,
      display_name: row.display_name,
      username: row.username,
      avatar_url: row.avatar_url,
    });
  }
  return map;
}

export async function fetchProfileByUsername(
  username: string,
): Promise<PublicProfile | null> {
  const key = normalizeUsername(username);
  if (!key) return null;

  // Usernames are stored lowercase; avoid ILIKE (underscore is a wildcard).
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, bio, created_at")
    .eq("username", key)
    .maybeSingle();

  if (error || !data) return null;
  return data as PublicProfile;
}

export async function countFollowers(userId: string): Promise<number> {
  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", userId);
  return count ?? 0;
}

export async function countFollowing(userId: string): Promise<number> {
  const { count } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", userId);
  return count ?? 0;
}

export async function isFollowing(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  return Boolean(data);
}

export async function followUser(followerId: string, followingId: string) {
  return supabase.from("follows").insert({
    follower_id: followerId,
    following_id: followingId,
  });
}

export async function unfollowUser(followerId: string, followingId: string) {
  return supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
}

/** Remove someone who follows you (owner of the profile). */
export async function removeFollower(ownerId: string, followerId: string) {
  return supabase
    .from("follows")
    .delete()
    .eq("following_id", ownerId)
    .eq("follower_id", followerId);
}

export async function setFollowNotify(
  followerId: string,
  followingId: string,
  notifyPosts: boolean,
) {
  return supabase
    .from("follows")
    .update({ notify_posts: notifyPosts })
    .eq("follower_id", followerId)
    .eq("following_id", followingId);
}

export async function getFollowNotify(
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("follows")
    .select("notify_posts")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  return Boolean((data as { notify_posts?: boolean } | null)?.notify_posts);
}

export type FollowListPerson = ProfileSnippet & {
  notify_posts?: boolean;
};

/** People who follow `userId`. */
export async function listFollowers(userId: string): Promise<FollowListPerson[]> {
  const { data: rows } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", userId)
    .order("created_at", { ascending: false });
  const ids = (rows ?? []).map((r) => r.follower_id as string);
  const map = await fetchProfileSnippets(ids);
  return ids.map((id) => map.get(id)).filter(Boolean) as FollowListPerson[];
}

/** People `userId` follows. Includes notify_posts when available. */
export async function listFollowing(userId: string): Promise<FollowListPerson[]> {
  const { data: rows } = await supabase
    .from("follows")
    .select("following_id, notify_posts")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false });
  const ids = (rows ?? []).map((r) => r.following_id as string);
  const notifyById = new Map(
    (rows ?? []).map((r) => [
      r.following_id as string,
      Boolean((r as { notify_posts?: boolean }).notify_posts),
    ]),
  );
  const map = await fetchProfileSnippets(ids);
  return ids
    .map((id) => {
      const p = map.get(id);
      if (!p) return null;
      return { ...p, notify_posts: notifyById.get(id) ?? false };
    })
    .filter(Boolean) as FollowListPerson[];
}

export async function fetchPublishedPostsByAuthor(authorId: string) {
  return supabase
    .from("posts")
    .select(
      "id, section, slug, title, excerpt, cover_path, cover_position, published_at, author, author_id",
    )
    .eq("author_id", authorId)
    .eq("published", true)
    .order("published_at", { ascending: false });
}

/** Published posts from authors the viewer follows. */
export async function fetchFeedPosts(viewerId: string) {
  const { data: follows } = await supabase
    .from("follows")
    .select("following_id, notify_posts")
    .eq("follower_id", viewerId);

  const authorIds = (follows ?? []).map((f) => f.following_id as string);
  if (authorIds.length === 0) {
    return { posts: [] as FeedPost[], followingIds: [] as string[], notifyByAuthor: new Map<string, boolean>() };
  }

  const notifyByAuthor = new Map(
    (follows ?? []).map((f) => [
      f.following_id as string,
      Boolean((f as { notify_posts?: boolean }).notify_posts),
    ]),
  );

  const { data: posts } = await supabase
    .from("posts")
    .select(
      "id, section, slug, title, excerpt, cover_path, cover_position, published_at, author, author_id",
    )
    .in("author_id", authorIds)
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(50);

  return {
    posts: (posts ?? []) as FeedPost[],
    followingIds: authorIds,
    notifyByAuthor,
  };
}

export type FeedPost = {
  id: string;
  section: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_path: string | null;
  cover_position: string | null;
  published_at: string;
  author: string | null;
  author_id: string | null;
};

/** Check username availability (case-insensitive; stored lowercase). */
export async function isUsernameAvailable(
  username: string,
  excludeUserId?: string,
): Promise<boolean> {
  const key = normalizeUsername(username);
  if (!key) return false;

  let query = supabase
    .from("profiles")
    .select("id")
    .eq("username", key)
    .limit(1);

  if (excludeUserId) {
    query = query.neq("id", excludeUserId);
  }

  const { data } = await query;
  return !data?.length;
}
