"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";

export default function HomePage() {
  const [creators, setCreators] = useState([]);
  const [items, setItems] = useState([]);
  const [posts, setPosts] = useState([]);
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

    return [
      { label: "Knowledge Base", value: items.length, sub: "Total references" },
      { label: "Competitors", value: creators.length, sub: "Tracked accounts" },
      { label: "Lead Magnets", value: leadMagnets.length, sub: "Draft assets" },
      { label: "Posts", value: linkedin + twitter, sub: `${twitter} X / ${linkedin} LI` },
    ];
  }, [items.length, creators.length, leadMagnets.length, autoPosts]);

  const chartPoints = useMemo(() => {
    const base = Array.from({ length: 36 }, (_, idx) => {
      const wave = Math.sin((idx / 4.3) * Math.PI) * 16;
      const boost = idx % 6 === 0 ? 22 : 0;
      return Math.max(8, 42 + wave + boost + Math.min(autoPosts.length, 24) * 0.6);
    });

    return base
      .map((point, idx) => `${(idx / (base.length - 1)) * 100},${100 - point}`)
      .join(" ");
  }, [autoPosts.length]);

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
    <div className="dashboard">
      <aside className="sidebar">
        <div className="logo">Acme Inc.</div>
        <Button className="quickCreate" onClick={getNewPosts} disabled={loading.autoContent}>
          {loading.autoContent ? "Working..." : "Quick Create"}
        </Button>

        <div className="navGroup">
          <div className="navItem active">Dashboard</div>
          <div className="navItem">Knowledge Base</div>
          <div className="navItem">Competitors</div>
          <div className="navItem">LinkedIn Twitter</div>
          <div className="navItem">Lead Magnets</div>
        </div>

        <div className="sidebarFoot">
          {discoveryMeta.fetchedAt
            ? `Updated ${new Date(discoveryMeta.fetchedAt).toLocaleString()}`
            : "No updates yet"}
        </div>
      </aside>

      <main className="content">
        <header className="contentTop">
          <div className="contentTitle">Documents</div>
          <div className="contentRight">GitHub</div>
        </header>

        {(status.error || status.success) && (
          <div className={`status ${status.error ? "error" : "success"}`}>
            {status.error || status.success}
          </div>
        )}

        <section className="metricsRow">
          {stats.map((card) => (
            <article className="metricCard" key={card.label}>
              <p>{card.label}</p>
              <h3>{card.value}</h3>
              <span>{card.sub}</span>
            </article>
          ))}
        </section>

        <section className="chartCard">
          <div className="chartHead">
            <div>
              <h3>Total Visitors</h3>
              <p>Last 3 months</p>
            </div>
            <div className="chartFilters">
              <button>Last 3 months</button>
              <button>Last 30 days</button>
              <button>Last 7 days</button>
            </div>
          </div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="areaChart">
            <polyline points={`0,100 ${chartPoints} 100,100`} className="fillLine" />
            <polyline points={chartPoints} className="strokeLine" />
          </svg>
        </section>

        <section className="tableCard">
          <div className="tableHead">
            <div className="tabs">
              <button className="active">Outline</button>
              <button>Past Performance</button>
              <button>Key Personnel</button>
            </div>
            <div className="tableActions">
              <button>Customize Columns</button>
              <button>Add Section</button>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Platform</th>
                <th>Status</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {autoPosts.slice(0, 8).map((post) => (
                <tr key={post.id}>
                  <td>{post.hook || "Draft"}</td>
                  <td>{post.platform}</td>
                  <td>Ready</td>
                  <td>Auto</td>
                </tr>
              ))}
              {autoPosts.length === 0 && (
                <tr>
                  <td colSpan={4} className="emptyRow">No rows yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="formsGrid">
          <article className="formCard">
            <h4>Knowledge Base</h4>
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
          </article>

          <article className="formCard">
            <h4>Competitors</h4>
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
          </article>

          <article className="formCard span2">
            <h4>Manual Generator</h4>
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

            <div className="drafts">
              {posts.map((post, idx) => (
                <div key={`${idx}-${post.hook}`} className="draftItem">
                  <strong>{post.hook || `Draft ${idx + 1}`}</strong>
                  <p>{post.post}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
