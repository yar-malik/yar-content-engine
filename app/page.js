"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
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
      if (!res.ok) throw new Error(data.error || "Failed to generate new posts");
      setViralTopics(data.viralTopics || []);
      setLeadMagnets(data.leadMagnets || []);
      setAutoPosts(data.autoPosts || []);
      setDiscoveryMeta({ fetchedAt: data.fetchedAt || "" });
      setStatus({
        error: "",
        success: `Generated ${data.newPosts?.length || 0} new posts and refreshed lead magnets.`,
      });
    } catch (error) {
      setStatus({ error: error.message || "Failed to generate new posts", success: "" });
    } finally {
      setLoading((prev) => ({ ...prev, autoContent: false }));
    }
  }

  async function refreshAll(platform = genForm.platform) {
    setLoading((prev) => ({ ...prev, creators: true, items: true, autoContent: true }));
    try {
      await Promise.all([fetchCreators(), fetchItems(platform), fetchAutoContent()]);
    } catch (error) {
      setStatus({ error: error.message || "Failed loading data", success: "" });
    } finally {
      setLoading((prev) => ({ ...prev, creators: false, items: false, autoContent: false }));
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recentKnowledgeBase = useMemo(() => items.slice(0, 4), [items]);
  const recentMagnets = useMemo(() => leadMagnets.slice(0, 4), [leadMagnets]);

  const platformPostCounts = useMemo(
    () =>
      autoPosts.reduce(
        (acc, post) => {
          if (post.platform === "twitter") acc.twitter += 1;
          if (post.platform === "linkedin") acc.linkedin += 1;
          return acc;
        },
        { twitter: 0, linkedin: 0 }
      ),
    [autoPosts]
  );

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
      if (!res.ok) throw new Error(data.error || "Failed to add creator");
      setCreatorForm({ name: "", url: "", platform: creatorForm.platform });
      await fetchCreators();
      setStatus({ error: "", success: "Competitor added." });
    } catch (error) {
      setStatus({ error: error.message || "Failed to add competitor", success: "" });
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
      if (!res.ok) throw new Error(data.error || "Failed to add item");
      setItemForm((prev) => ({ ...prev, source: "", text: "" }));
      await fetchItems(genForm.platform);
      setStatus({ error: "", success: "Knowledge base item added." });
    } catch (error) {
      setStatus({ error: error.message || "Failed to add item", success: "" });
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
      if (!res.ok) throw new Error(data.error || "Failed to generate posts");
      setPosts(data.posts || []);
      setStatus({ error: "", success: `Generated ${data.posts?.length || 0} manual drafts.` });
    } catch (error) {
      setStatus({ error: error.message || "Failed to generate posts", success: "" });
    } finally {
      setLoading((prev) => ({ ...prev, generate: false }));
    }
  }

  return (
    <div className="saasPage">
      <div className="saasShell">
        <aside className="leftPanel">
          <div className="panelHead">
            <p className="panelEyebrow">Content Engine</p>
            <h1>Growth OS</h1>
            <p>Shadcn-style B2B workspace for social pipeline execution.</p>
          </div>

          <section className="panelSection">
            <h2>Knowledge Base</h2>
            <p>{items.length} total references</p>
            <div className="panelList">
              {recentKnowledgeBase.length === 0 && <div className="panelListItem">No references yet</div>}
              {recentKnowledgeBase.map((item) => (
                <div className="panelListItem" key={item.id}>
                  {item.text.slice(0, 82)}{item.text.length > 82 ? "..." : ""}
                </div>
              ))}
            </div>
          </section>

          <section className="panelSection">
            <h2>Competitors</h2>
            <p>{creators.length} tracked accounts</p>
            <div className="panelList">
              {creators.length === 0 && <div className="panelListItem">No competitors yet</div>}
              {creators.slice(0, 4).map((creator) => (
                <div className="panelListItem" key={creator.id}>
                  <span>{creator.name}</span>
                  <small>{creator.platform}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="panelSection">
            <h2>LinkedIn Twitter</h2>
            <p>Post volume by platform</p>
            <div className="panelStats">
              <div><span>Twitter / X</span><strong>{platformPostCounts.twitter}</strong></div>
              <div><span>LinkedIn</span><strong>{platformPostCounts.linkedin}</strong></div>
            </div>
          </section>

          <section className="panelSection">
            <h2>Lead Magnets</h2>
            <p>{leadMagnets.length} drafts ready</p>
            <div className="panelList">
              {recentMagnets.length === 0 && <div className="panelListItem">No lead magnets yet</div>}
              {recentMagnets.map((magnet) => (
                <div className="panelListItem" key={magnet.id}>
                  <span>{magnet.title}</span>
                  <small>{magnet.assignedTo}</small>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <main className="workspace">
          <header className="workspaceHead">
            <div>
              <p className="panelEyebrow">Automation Studio</p>
              <h2>B2B Content Operations</h2>
              <p>Discover trends, build lead magnets, and publish platform-native content from your reference library.</p>
            </div>
            <div className="workspaceActions">
              <Button type="button" onClick={getNewPosts} disabled={loading.autoContent}>
                {loading.autoContent ? "Creating Posts..." : "Get New Posts"}
              </Button>
              <span>
                Last refresh: {discoveryMeta.fetchedAt ? new Date(discoveryMeta.fetchedAt).toLocaleString() : "Not refreshed yet"}
              </span>
            </div>
          </header>

          {(status.error || status.success) && (
            <div className={`statusBanner ${status.error ? "error" : "success"}`}>
              {status.error || status.success}
            </div>
          )}

          <section className="workspaceGrid">
            <Card>
              <CardHeader>
                <CardTitle>Viral Signals</CardTitle>
                <CardDescription>Current discovery inputs from your AI niche.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="list">
                  {!loading.autoContent && viralTopics.length === 0 && <div className="item muted">No trend signals yet.</div>}
                  {viralTopics.map((topic) => (
                    <div className="item" key={topic.id}>
                      <strong>{topic.title}</strong>
                      <div className="meta">
                        <Badge>{topic.source}</Badge>
                        <span>Score: {Number(topic.score || 0).toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lead Magnets</CardTitle>
                <CardDescription>Generated and assigned assets for your team.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="list">
                  {!loading.autoContent && leadMagnets.length === 0 && <div className="item muted">No lead magnets yet.</div>}
                  {leadMagnets.map((magnet) => (
                    <div className="item" key={magnet.id}>
                      <strong>{magnet.title}</strong>
                      <div className="meta">
                        <Badge variant="secondary">{magnet.type}</Badge>
                        <span>{magnet.assignedTo}</span>
                      </div>
                      <p className="inlineSummary">{magnet.hook}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="fullWidth">
              <CardHeader>
                <CardTitle>Auto-Generated Posts</CardTitle>
                <CardDescription>Fresh Twitter and LinkedIn drafts on every run.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="list">
                  {!loading.autoContent && autoPosts.length === 0 && <div className="item muted">No posts yet. Click Get New Posts.</div>}
                  {autoPosts.map((post) => (
                    <div className="item outputCard" key={post.id}>
                      <strong>{post.hook || "New Draft"}</strong>
                      <div className="meta">
                        <Badge>{post.platform}</Badge>
                        <span>{new Date(post.createdAt).toLocaleString()}</span>
                      </div>
                      <pre>{post.post}</pre>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Competitor Manager</CardTitle>
                <CardDescription>Add and track market voices.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="form" onSubmit={addCreator}>
                  <label className="field"><span className="fieldLabel">Name</span><Input placeholder="Creator name" value={creatorForm.name} onChange={(e) => setCreatorForm((prev) => ({ ...prev, name: e.target.value }))} /></label>
                  <label className="field"><span className="fieldLabel">Profile URL</span><Input placeholder="https://x.com/username" value={creatorForm.url} onChange={(e) => setCreatorForm((prev) => ({ ...prev, url: e.target.value }))} /></label>
                  <label className="field"><span className="fieldLabel">Platform</span><Select value={creatorForm.platform} onChange={(e) => setCreatorForm((prev) => ({ ...prev, platform: e.target.value }))}><option value="twitter">Twitter / X</option><option value="linkedin">LinkedIn</option></Select></label>
                  <Button type="submit">Add Competitor</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Knowledge Base Manager</CardTitle>
                <CardDescription>Feed your generator with reference quality content.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="form" onSubmit={addLibraryItem}>
                  <div className="row">
                    <label className="field"><span className="fieldLabel">Platform</span><Select value={itemForm.platform} onChange={(e) => setItemForm((prev) => ({ ...prev, platform: e.target.value }))}><option value="twitter">Twitter / X</option><option value="linkedin">LinkedIn</option></Select></label>
                    <label className="field"><span className="fieldLabel">Source</span><Input placeholder="Post URL or author" value={itemForm.source} onChange={(e) => setItemForm((prev) => ({ ...prev, source: e.target.value }))} /></label>
                  </div>
                  <label className="field"><span className="fieldLabel">Reference Post</span><Textarea placeholder="Paste a high-performing post..." value={itemForm.text} onChange={(e) => setItemForm((prev) => ({ ...prev, text: e.target.value }))} /></label>
                  <Button type="submit">Add Reference</Button>
                </form>
              </CardContent>
            </Card>

            <Card className="fullWidth">
              <CardHeader>
                <CardTitle>Manual Generator</CardTitle>
                <CardDescription>Use controlled prompting for campaign-specific drafts.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="form" onSubmit={generate}>
                  <div className="row row-tight">
                    <label className="field"><span className="fieldLabel">Platform</span><Select value={genForm.platform} onChange={(e) => { const platform = e.target.value; setGenForm((prev) => ({ ...prev, platform })); fetchItems(platform).catch(() => {}); }}><option value="twitter">Twitter / X</option><option value="linkedin">LinkedIn</option></Select></label>
                    <label className="field"><span className="fieldLabel">Variants</span><Input type="number" min={1} max={10} value={genForm.variants} onChange={(e) => setGenForm((prev) => ({ ...prev, variants: Math.max(1, Math.min(Number(e.target.value || 1), 10)) }))} /></label>
                  </div>
                  <label className="field"><span className="fieldLabel">Brief</span><Textarea placeholder="What should this post communicate?" value={genForm.brief} onChange={(e) => setGenForm((prev) => ({ ...prev, brief: e.target.value }))} /></label>
                  <div className="row">
                    <label className="field"><span className="fieldLabel">Audience</span><Input placeholder="Who is this for?" value={genForm.audience} onChange={(e) => setGenForm((prev) => ({ ...prev, audience: e.target.value }))} /></label>
                    <label className="field"><span className="fieldLabel">Goal</span><Input placeholder="What action should they take?" value={genForm.goal} onChange={(e) => setGenForm((prev) => ({ ...prev, goal: e.target.value }))} /></label>
                  </div>
                  <label className="field"><span className="fieldLabel">CTA</span><Input placeholder="Reply, DM, visit site..." value={genForm.callToAction} onChange={(e) => setGenForm((prev) => ({ ...prev, callToAction: e.target.value }))} /></label>
                  <Button type="submit" disabled={loading.generate}>{loading.generate ? "Generating..." : "Generate Posts"}</Button>
                </form>

                <Separator className="generator-sep" />

                <div className="output">
                  {posts.map((post, idx) => (
                    <div key={`${idx}-${post.hook}`} className="item outputCard">
                      <strong>{post.hook || `Draft ${idx + 1}`}</strong>
                      <pre>{post.post}</pre>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}
