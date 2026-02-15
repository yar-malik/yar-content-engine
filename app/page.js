"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Separator } from "../components/ui/separator";
import { Textarea } from "../components/ui/textarea";

export default function HomePage() {
  const [creators, setCreators] = useState([]);
  const [items, setItems] = useState([]);
  const [posts, setPosts] = useState([]);
  const [leadMagnets, setLeadMagnets] = useState([]);
  const [autoPosts, setAutoPosts] = useState([]);

  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState({
    creators: false,
    items: false,
    generate: false,
    autoContent: false,
  });

  const [postFilter, setPostFilter] = useState("all");
  const [copiedPostId, setCopiedPostId] = useState("");

  const [creatorForm, setCreatorForm] = useState({ name: "", url: "", platform: "twitter" });
  const [itemForm, setItemForm] = useState({ platform: "twitter", source: "", text: "" });
  const [genForm, setGenForm] = useState({
    platform: "twitter",
    brief: "",
    audience: "",
    goal: "",
    callToAction: "",
    variants: 3,
  });

  async function fetchCreators() {
    const res = await fetch("/api/creators", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load creators");
    setCreators(data.creators || []);
  }

  async function fetchItems(platform) {
    const query = platform ? `?platform=${platform}` : "";
    const res = await fetch(`/api/items${query}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load items");
    setItems(data.items || []);
  }

  async function fetchAutoContent() {
    const res = await fetch("/api/auto-content", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load auto content");
    setLeadMagnets(data.leadMagnets || []);
    setAutoPosts(data.autoPosts || []);
  }

  async function refreshAll(platform = genForm.platform) {
    setLoading((prev) => ({ ...prev, creators: true, items: true, autoContent: true }));
    try {
      await Promise.all([fetchCreators(), fetchItems(platform), fetchAutoContent()]);
    } catch (error) {
      setStatus({ error: error.message || "Load failed", success: "" });
    } finally {
      setLoading((prev) => ({ ...prev, creators: false, items: false, autoContent: false }));
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const manualPosts = useMemo(
    () =>
      posts.map((post, idx) => ({
        id: `manual-${idx}`,
        platform: genForm.platform,
        hook: post.hook,
        post: post.post,
        source: "manual",
        createdAt: new Date().toISOString(),
      })),
    [posts, genForm.platform]
  );

  const allPosts = useMemo(() => {
    const auto = autoPosts.map((post) => ({ ...post, source: "auto" }));
    return [...manualPosts, ...auto].sort((a, b) =>
      (a.createdAt || "") < (b.createdAt || "") ? 1 : -1
    );
  }, [autoPosts, manualPosts]);

  const visiblePosts = useMemo(() => {
    if (postFilter === "all") return allPosts;
    return allPosts.filter((post) => post.platform === postFilter);
  }, [allPosts, postFilter]);

  const stats = useMemo(() => {
    const linkedin = allPosts.filter((post) => post.platform === "linkedin").length;
    const twitter = allPosts.filter((post) => post.platform === "twitter").length;
    return {
      totalPosts: allPosts.length,
      twitter,
      linkedin,
      references: items.length,
      competitors: creators.length,
      leadMagnets: leadMagnets.length,
    };
  }, [allPosts, items.length, creators.length, leadMagnets.length]);

  async function copyText(text, postId) {
    try {
      await navigator.clipboard.writeText(text || "");
      setCopiedPostId(postId || "bulk");
      setStatus({ error: "", success: "Copied" });
      setTimeout(() => setCopiedPostId(""), 1200);
    } catch {
      setStatus({ error: "Clipboard unavailable", success: "" });
    }
  }

  async function copyPlatform(platform) {
    const chunk = allPosts
      .filter((post) => post.platform === platform)
      .map((post, idx) => `${idx + 1}. ${post.post}`)
      .join("\n\n");

    if (!chunk) {
      setStatus({ error: `No ${platform} posts to copy`, success: "" });
      return;
    }

    await copyText(chunk, `bulk-${platform}`);
  }

  async function getNewPosts() {
    setStatus({ error: "", success: "" });
    setLoading((prev) => ({ ...prev, autoContent: true }));
    try {
      const res = await fetch("/api/auto-content", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 3 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setLeadMagnets(data.leadMagnets || []);
      setAutoPosts(data.autoPosts || []);
      setStatus({ error: "", success: `Generated ${data.newPosts?.length || 0} posts` });
    } catch (error) {
      setStatus({ error: error.message || "Generation failed", success: "" });
    } finally {
      setLoading((prev) => ({ ...prev, autoContent: false }));
    }
  }

  async function addCreator(event) {
    event.preventDefault();
    setStatus({ error: "", success: "" });
    try {
      const res = await fetch("/api/creators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creatorForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Add failed");
      setCreatorForm({ name: "", url: "", platform: creatorForm.platform });
      await fetchCreators();
      setStatus({ error: "", success: "Competitor added" });
    } catch (error) {
      setStatus({ error: error.message || "Add failed", success: "" });
    }
  }

  async function addLibraryItem(event) {
    event.preventDefault();
    setStatus({ error: "", success: "" });
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Add failed");
      setItemForm((prev) => ({ ...prev, source: "", text: "" }));
      await fetchItems(genForm.platform);
      setStatus({ error: "", success: "Reference added" });
    } catch (error) {
      setStatus({ error: error.message || "Add failed", success: "" });
    }
  }

  async function generate(event) {
    event.preventDefault();
    setStatus({ error: "", success: "" });
    setLoading((prev) => ({ ...prev, generate: true }));
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(genForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generate failed");
      setPosts(data.posts || []);
      setStatus({ error: "", success: `${data.posts?.length || 0} drafts` });
    } catch (error) {
      setStatus({ error: error.message || "Generate failed", success: "" });
    } finally {
      setLoading((prev) => ({ ...prev, generate: false }));
    }
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="mx-auto max-w-[1500px] p-4 md:p-6">
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Posts</p><p className="text-2xl font-semibold">{stats.totalPosts}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Twitter</p><p className="text-2xl font-semibold">{stats.twitter}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">LinkedIn</p><p className="text-2xl font-semibold">{stats.linkedin}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Lead Magnets</p><p className="text-2xl font-semibold">{stats.leadMagnets}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">References</p><p className="text-2xl font-semibold">{stats.references}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Competitors</p><p className="text-2xl font-semibold">{stats.competitors}</p></CardContent></Card>
        </div>

        <Card className="mb-4">
          <CardContent className="flex flex-wrap items-center gap-2 p-4">
            <Button onClick={getNewPosts} disabled={loading.autoContent}>{loading.autoContent ? "Generating..." : "Get New Posts"}</Button>
            <Button variant="outline" onClick={() => copyPlatform("linkedin")}>Copy All LinkedIn</Button>
            <Button variant="outline" onClick={() => copyPlatform("twitter")}>Copy All Twitter</Button>
            <div className="ml-auto flex gap-2">
              <Button variant={postFilter === "all" ? "secondary" : "ghost"} onClick={() => setPostFilter("all")}>All</Button>
              <Button variant={postFilter === "linkedin" ? "secondary" : "ghost"} onClick={() => setPostFilter("linkedin")}>LinkedIn</Button>
              <Button variant={postFilter === "twitter" ? "secondary" : "ghost"} onClick={() => setPostFilter("twitter")}>Twitter</Button>
            </div>
            {(status.error || status.success) && (
              <div className="w-full rounded-md border px-3 py-2 text-sm">{status.error || status.success}</div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader><CardTitle>Publishing Queue</CardTitle></CardHeader>
            <CardContent>
              <div className="max-h-[640px] space-y-3 overflow-auto pr-1">
                {visiblePosts.map((post) => (
                  <div key={post.id} className="rounded-lg border bg-background p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{post.hook || "Draft"}</p>
                        <p className="text-xs text-muted-foreground">{post.platform} · {post.source || "auto"}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => copyText(post.post, post.id)}>
                        {copiedPostId === post.id ? "Copied" : "Copy"}
                      </Button>
                    </div>
                    <Textarea value={post.post || ""} readOnly className="min-h-[132px]" />
                  </div>
                ))}
                {visiblePosts.length === 0 && <div className="rounded-md border p-4 text-sm text-muted-foreground">No posts yet.</div>}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Manual Generator</CardTitle></CardHeader>
              <CardContent>
                <form className="space-y-2" onSubmit={generate}>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Select value={genForm.platform} onChange={(e) => { const platform = e.target.value; setGenForm((prev) => ({ ...prev, platform })); fetchItems(platform).catch(() => {}); }}>
                      <option value="twitter">Twitter / X</option>
                      <option value="linkedin">LinkedIn</option>
                    </Select>
                    <Input type="number" min={1} max={10} value={genForm.variants} onChange={(e) => setGenForm((prev) => ({ ...prev, variants: Math.max(1, Math.min(Number(e.target.value || 1), 10)) }))} />
                  </div>
                  <Textarea placeholder="Brief" value={genForm.brief} onChange={(e) => setGenForm((prev) => ({ ...prev, brief: e.target.value }))} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="Audience" value={genForm.audience} onChange={(e) => setGenForm((prev) => ({ ...prev, audience: e.target.value }))} />
                    <Input placeholder="Goal" value={genForm.goal} onChange={(e) => setGenForm((prev) => ({ ...prev, goal: e.target.value }))} />
                  </div>
                  <Input placeholder="CTA" value={genForm.callToAction} onChange={(e) => setGenForm((prev) => ({ ...prev, callToAction: e.target.value }))} />
                  <Button type="submit" disabled={loading.generate}>{loading.generate ? "Generating..." : "Generate"}</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Knowledge Base</CardTitle></CardHeader>
              <CardContent>
                <form className="space-y-2" onSubmit={addLibraryItem}>
                  <Select value={itemForm.platform} onChange={(e) => setItemForm((prev) => ({ ...prev, platform: e.target.value }))}>
                    <option value="twitter">Twitter / X</option>
                    <option value="linkedin">LinkedIn</option>
                  </Select>
                  <Input placeholder="Source" value={itemForm.source} onChange={(e) => setItemForm((prev) => ({ ...prev, source: e.target.value }))} />
                  <Textarea placeholder="Reference post" value={itemForm.text} onChange={(e) => setItemForm((prev) => ({ ...prev, text: e.target.value }))} />
                  <Button type="submit" variant="outline">Add Reference</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Competitors</CardTitle></CardHeader>
              <CardContent>
                <form className="space-y-2" onSubmit={addCreator}>
                  <Input placeholder="Name" value={creatorForm.name} onChange={(e) => setCreatorForm((prev) => ({ ...prev, name: e.target.value }))} />
                  <Input placeholder="Profile URL" value={creatorForm.url} onChange={(e) => setCreatorForm((prev) => ({ ...prev, url: e.target.value }))} />
                  <Select value={creatorForm.platform} onChange={(e) => setCreatorForm((prev) => ({ ...prev, platform: e.target.value }))}>
                    <option value="twitter">Twitter / X</option>
                    <option value="linkedin">LinkedIn</option>
                  </Select>
                  <Button type="submit" variant="outline">Add Competitor</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Lead Magnets</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-44 space-y-2 overflow-auto pr-1">
                  {leadMagnets.slice(0, 8).map((magnet) => (
                    <div key={magnet.id} className="rounded-md border p-2">
                      <p className="text-sm font-medium">{magnet.title}</p>
                      <p className="text-xs text-muted-foreground">{magnet.assignedTo}</p>
                    </div>
                  ))}
                  {leadMagnets.length === 0 && <p className="text-sm text-muted-foreground">No lead magnets yet.</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator className="my-4" />

        <p className="text-xs text-muted-foreground">
          Copy workflow: generate {"->"} open post {"->"} click Copy {"->"} paste into LinkedIn or X.
        </p>
      </div>
    </div>
  );
}
