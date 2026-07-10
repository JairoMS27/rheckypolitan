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

export async function fetchPublishedPostsByAuthor(authorId: string) {
  return supabase
    .from("posts")
    .select(
      "id, section, slug, title, excerpt, cover_path, cover_position, published_at, author",
    )
    .eq("author_id", authorId)
    .eq("published", true)
    .order("published_at", { ascending: false });
}

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
