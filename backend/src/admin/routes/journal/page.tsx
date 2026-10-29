import { defineRouteConfig } from "@medusajs/admin-sdk";
import { BookOpen } from "@medusajs/icons";
import {
  Container,
  Heading,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  Text,
} from "@medusajs/ui";
import { useEffect, useState } from "react";
type Post = {
  id?: string;
  title: string;
  handle: string;
  excerpt: string;
  content_html: string;
  image: string | null;
  category: string;
  author: string;
  published: boolean;
  published_at: string | null;
};
const empty: Post = {
  title: "",
  handle: "",
  excerpt: "",
  content_html: "<p>Your story begins here.</p>",
  image: null,
  category: "Kitchen notes",
  author: "The Ceylon journal",
  published: false,
  published_at: null,
};
async function api(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("medusa_auth_token");
  const response = await fetch(path, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.message || "Unable to save the story.");
  return data;
}
export default function JournalPage() {
  const [posts, setPosts] = useState<Post[]>([]),
    [draft, setDraft] = useState<Post | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState("");
  const load = () =>
    api("/admin/journal")
      .then((d) => setPosts(d.posts))
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  const field = (key: keyof Post, value: unknown) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const { id, ...body } = draft;
      await api("/admin/journal" + (id ? `/${id}` : ""), {
        method: "POST",
        body: JSON.stringify({
          ...body,
          published_at: body.published
            ? body.published_at || new Date().toISOString()
            : null,
        }),
      });
      setDraft(null);
      setSaved(
        "Story saved. Published changes appear on the storefront when refreshed.",
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Container>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <Heading>Journal</Heading>
          <Text>
            Write, edit, and publish stories for the Ceylon storefront.
          </Text>
        </div>
        <Button
          onClick={() => {
            setDraft({ ...empty });
            setSaved("");
          }}
        >
          New story
        </Button>
      </div>
      {error && (
        <p role="alert" style={{ color: "#a33", marginBottom: 16 }}>
          {error}
        </p>
      )}
      {saved && (
        <p role="status" style={{ color: "#27663b", marginBottom: 16 }}>
          {saved}
        </p>
      )}
      {draft ? (
        <form
          onSubmit={save}
          style={{ display: "grid", gap: 18, maxWidth: 850 }}
        >
          <Heading level="h2">
            {draft.id ? "Edit story" : "A new chapter"}
          </Heading>
          {(["title", "handle", "category", "author", "image"] as const).map(
            (key) => (
              <div key={key}>
                <Label htmlFor={key}>
                  {key === "image" ? "Image URL" : key}
                </Label>
                <Input
                  id={key}
                  value={draft[key] || ""}
                  required={key !== "image"}
                  onChange={(e) => field(key, e.target.value)}
                />
              </div>
            ),
          )}
          <div>
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              value={draft.excerpt}
              onChange={(e) => field("excerpt", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="content">Article body (HTML)</Label>
            <Textarea
              id="content"
              style={{ minHeight: 300, fontFamily: "monospace" }}
              value={draft.content_html}
              onChange={(e) => field("content_html", e.target.value)}
              required
            />
            <Text size="small">
              Use paragraphs, headings, lists, and emphasis. The storefront
              sanitizes rich text.
            </Text>
          </div>
          <label style={{ display: "flex", gap: 10 }}>
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(e) => field("published", e.target.checked)}
            />
            Published on storefront
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save story"}
            </Button>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setDraft(null)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div>
          {posts.map((post) => (
            <div
              key={post.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 20,
                padding: "20px 0",
                borderTop: "1px solid #ddd",
              }}
            >
              <div>
                <Heading level="h2">{post.title}</Heading>
                <Text>
                  {post.category} · {post.published ? "Published" : "Draft"} ·
                  /blog/{post.handle}
                </Text>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  const {
                    id,
                    title,
                    handle,
                    excerpt,
                    content_html,
                    image,
                    category,
                    author,
                    published,
                    published_at,
                  } = post;
                  setDraft({
                    id,
                    title,
                    handle,
                    excerpt,
                    content_html,
                    image,
                    category,
                    author,
                    published,
                    published_at,
                  });
                  setSaved("");
                }}
              >
                Edit story
              </Button>
            </div>
          ))}
        </div>
      )}
    </Container>
  );
}
export const config = defineRouteConfig({ label: "Journal", icon: BookOpen });
