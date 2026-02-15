"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "../components/ui/badge";
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
  const [viralTopics, setViralTopics] = useState([]);
  const [leadMagnets, setLeadMagnets] = useState([]);
  const [autoPosts, setAutoPosts] = useState([]);
  const [discoveryMeta, setDiscoveryMeta] = useState({ fetchedAt: "" });
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState({
    creators: false,
    items: false,
    generate: false,
    autoContent: false,
  });

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
    setViralTopics(data.viralTopics || []);
    setLeadMagnets(data.leadMagnets || []);
    setAutoPosts(data.autoPosts || []);
    setDiscoveryMeta({ fetchedAt: data.fetchedAt || "" });
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

  const stats = useMemo(() => {
    const linkedin = autoPosts.filter((post) => post.platform === "linkedin").length;
    const twitter = autoPosts.filter((post) => post.platform === "twitter").length;
    return {
      kb: items.length,
      competitors: creators.length,
      leads: leadMagnets.length,
      viral: viralTopics.length,
      linkedin,
      twitter,
    };
  }, [items.length, creators.length, leadMagnets.length, viralTopics.length, autoPosts]);

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
      setViralTopics(data.viralTopics || []);
      setLeadMagnets(data.leadMagnets || []);
      setAutoPosts(data.autoPosts || []);
      setDiscoveryMeta({ fetchedAt: data.fetchedAt || "" });
      setStatus({ error: "", success: `+${data.newPosts?.length || 0} posts` });
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
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span>Content OS</span>
        </div>
        <nav className="nav">
          <button className="navItem active">Knowledge Base</button>
          <button className="navItem">Competitors</button>
          <button className="navItem">LinkedIn / Twitter</button>
          <button className="navItem">Lead Magnets</button>
        </nav>
        <div className="metaTime">
          {discoveryMeta.fetchedAt
            ? `Updated ${new Date(discoveryMeta.fetchedAt).toLocaleString()}`
            : "No updates yet"}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="kpis">
            <div><span>KB</span><strong>{stats.kb}</strong></div>
            <div><span>Comp</span><strong>{stats.competitors}</strong></div>
            <div><span>Leads</span><strong>{stats.leads}</strong></div>
            <div><span>Viral</span><strong>{stats.viral}</strong></div>
            <div><span>X</span><strong>{stats.twitter}</strong></div>
            <div><span>LI</span><strong>{stats.linkedin}</strong></div>
          </div>
          <div className="topbarActions">
            <Button onClick={getNewPosts} disabled={loading.autoContent}>
              {loading.autoContent ? "Working..." : "Get New Posts"}
            </Button>
            {status.error && <Badge variant="secondary">{status.error}</Badge>}
            {status.success && <Badge>{status.success}</Badge>}
          </div>
        </header>

        <section className="grid">
          <Card>
            <CardHeader>
              <CardTitle>Viral Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="list compact">
                {viralTopics.slice(0, 12).map((topic) => (
                  <div key={topic.id} className="itemRow">
                    <span>{topic.title}</span>
                    <Badge variant="secondary">{Number(topic.score || 0).toFixed(1)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lead Magnets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="list compact">
                {leadMagnets.slice(0, 12).map((magnet) => (
                  <div key={magnet.id} className="itemRow">
                    <span>{magnet.title}</span>
                    <Badge variant="secondary">{magnet.assignedTo}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="span2">
            <CardHeader>
              <CardTitle>Auto Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="postList">
                {autoPosts.slice(0, 18).map((post) => (
                  <div key={post.id} className="postItem">
                    <div className="postHead">
                      <strong>{post.hook || "Draft"}</strong>
                      <Badge>{post.platform}</Badge>
                    </div>
                    <p>{post.post}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Knowledge Base</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="form" onSubmit={addLibraryItem}>
                <Select
                  value={itemForm.platform}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, platform: e.target.value }))}
                >
                  <option value="twitter">Twitter / X</option>
                  <option value="linkedin">LinkedIn</option>
                </Select>
                <Input
                  placeholder="Source"
                  value={itemForm.source}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, source: e.target.value }))}
                />
                <Textarea
                  placeholder="Reference post"
                  value={itemForm.text}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, text: e.target.value }))}
                />
                <Button type="submit">Add</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Competitors</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="form" onSubmit={addCreator}>
                <Input
                  placeholder="Name"
                  value={creatorForm.name}
                  onChange={(e) => setCreatorForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  placeholder="Profile URL"
                  value={creatorForm.url}
                  onChange={(e) => setCreatorForm((prev) => ({ ...prev, url: e.target.value }))}
                />
                <Select
                  value={creatorForm.platform}
                  onChange={(e) => setCreatorForm((prev) => ({ ...prev, platform: e.target.value }))}
                >
                  <option value="twitter">Twitter / X</option>
                  <option value="linkedin">LinkedIn</option>
                </Select>
                <Button type="submit">Add</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="span2">
            <CardHeader>
              <CardTitle>Manual Generator</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="form" onSubmit={generate}>
                <div className="row2">
                  <Select
                    value={genForm.platform}
                    onChange={(e) => {
                      const platform = e.target.value;
                      setGenForm((prev) => ({ ...prev, platform }));
                      fetchItems(platform).catch(() => {});
                    }}
                  >
                    <option value="twitter">Twitter / X</option>
                    <option value="linkedin">LinkedIn</option>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={genForm.variants}
                    onChange={(e) =>
                      setGenForm((prev) => ({
                        ...prev,
                        variants: Math.max(1, Math.min(Number(e.target.value || 1), 10)),
                      }))
                    }
                  />
                </div>
                <Textarea
                  placeholder="Brief"
                  value={genForm.brief}
                  onChange={(e) => setGenForm((prev) => ({ ...prev, brief: e.target.value }))}
                />
                <div className="row2">
                  <Input
                    placeholder="Audience"
                    value={genForm.audience}
                    onChange={(e) => setGenForm((prev) => ({ ...prev, audience: e.target.value }))}
                  />
                  <Input
                    placeholder="Goal"
                    value={genForm.goal}
                    onChange={(e) => setGenForm((prev) => ({ ...prev, goal: e.target.value }))}
                  />
                </div>
                <Input
                  placeholder="CTA"
                  value={genForm.callToAction}
                  onChange={(e) => setGenForm((prev) => ({ ...prev, callToAction: e.target.value }))}
                />
                <Button type="submit" disabled={loading.generate}>
                  {loading.generate ? "Generating..." : "Generate"}
                </Button>
              </form>

              <Separator className="sep" />

              <div className="postList">
                {posts.map((post, idx) => (
                  <div key={`${idx}-${post.hook}`} className="postItem">
                    <div className="postHead">
                      <strong>{post.hook || `Draft ${idx + 1}`}</strong>
                    </div>
                    <p>{post.post}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
