"use client";

import { useEffect, useMemo, useState } from "react";

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

  const [creatorForm, setCreatorForm] = useState({
    name: "",
    url: "",
    platform: "twitter",
  });

  const [itemForm, setItemForm] = useState({
    platform: "twitter",
    source: "",
    text: "",
  });

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
        success: `Generated ${data.newPosts?.length || 0} new posts plus updated lead magnets from current viral trends.`,
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

  const platformPostCounts = useMemo(() => {
    return autoPosts.reduce(
      (acc, post) => {
        if (post.platform === "twitter") acc.twitter += 1;
        if (post.platform === "linkedin") acc.linkedin += 1;
        return acc;
      },
      { twitter: 0, linkedin: 0 }
    );
  }, [autoPosts]);

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
      setStatus({ error: "", success: "Creator added." });
    } catch (error) {
      setStatus({ error: error.message || "Failed to add creator", success: "" });
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
      setStatus({ error: "", success: "Reference post added." });
    } catch (error) {
      setStatus({ error: error.message || "Failed to add post", success: "" });
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
      setStatus({ error: "", success: `Generated ${data.posts?.length || 0} post(s).` });
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
            <h1>SaaS Workspace</h1>
            <p>Everything you need to run repeatable social content ops.</p>
          </div>

          <section className="panelSection">
            <h2>Knowledge Base</h2>
            <p>{items.length} total reference posts</p>
            <div className="panelList">
              {recentKnowledgeBase.length === 0 && <div className="panelListItem">No references yet</div>}
              {recentKnowledgeBase.map((item) => (
                <div className="panelListItem" key={item.id}>
                  {item.text.slice(0, 84)}
                  {item.text.length > 84 ? "..." : ""}
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
            <p>Auto-generated post output</p>
            <div className="panelStats">
              <div>
                <span>Twitter / X</span>
                <strong>{platformPostCounts.twitter}</strong>
              </div>
              <div>
                <span>LinkedIn</span>
                <strong>{platformPostCounts.linkedin}</strong>
              </div>
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
              <h2>Viral Content + Lead Magnet System</h2>
              <p>
                Scrape trend signals, build lead magnets, and produce high-quality platform posts
                from your own reference style library.
              </p>
            </div>
            <div className="workspaceActions">
              <button type="button" className="primaryAction" onClick={getNewPosts} disabled={loading.autoContent}>
                {loading.autoContent ? "Creating Posts..." : "Get New Posts"}
              </button>
              <span>
                Last refresh:{" "}
                {discoveryMeta.fetchedAt
                  ? new Date(discoveryMeta.fetchedAt).toLocaleString()
                  : "Not refreshed yet"}
              </span>
            </div>
          </header>

          {(status.error || status.success) && (
            <div className={`statusBanner ${status.error ? "error" : "success"}`}>
              {status.error || status.success}
            </div>
          )}

          <section className="workspaceGrid">
            <article className="card">
              <div className="sectionHead">
                <h3>Viral Signals</h3>
                <p>Current trend inputs from online discovery.</p>
              </div>
              <div className="list">
                {!loading.autoContent && viralTopics.length === 0 && (
                  <div className="item muted">No trend signals yet. Use Get New Posts.</div>
                )}
                {viralTopics.map((topic) => (
                  <div className="item" key={topic.id}>
                    <strong>{topic.title}</strong>
                    <div className="meta">
                      <span className="tag">{topic.source}</span>
                      <span>Score: {Number(topic.score || 0).toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="card">
              <div className="sectionHead">
                <h3>Generated Lead Magnets</h3>
                <p>Team-assigned assets generated from trend signals.</p>
              </div>
              <div className="list">
                {!loading.autoContent && leadMagnets.length === 0 && (
                  <div className="item muted">No lead magnets yet. Use Get New Posts.</div>
                )}
                {leadMagnets.map((magnet) => (
                  <div className="item" key={magnet.id}>
                    <strong>{magnet.title}</strong>
                    <div className="meta">
                      <span className="tag">{magnet.type}</span>
                      <span>{magnet.assignedTo}</span>
                    </div>
                    <p className="inlineSummary">{magnet.hook}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="card fullWidth">
              <div className="sectionHead">
                <h3>Auto-Generated Posts</h3>
                <p>Fresh Twitter and LinkedIn drafts generated on every click.</p>
              </div>
              <div className="list">
                {!loading.autoContent && autoPosts.length === 0 && (
                  <div className="item muted">No posts yet. Click Get New Posts.</div>
                )}
                {autoPosts.map((post) => (
                  <div className="item outputCard" key={post.id}>
                    <strong>{post.hook || "New Draft"}</strong>
                    <div className="meta">
                      <span className="tag">{post.platform}</span>
                      <span>{new Date(post.createdAt).toLocaleString()}</span>
                    </div>
                    <pre>{post.post}</pre>
                  </div>
                ))}
              </div>
            </article>

            <article className="card">
              <div className="sectionHead">
                <h3>Competitors</h3>
                <p>Track creator or competitor sources.</p>
              </div>

              <form className="form" onSubmit={addCreator}>
                <label className="field">
                  <span className="fieldLabel">Creator Name</span>
                  <input
                    placeholder="Justin Welsh"
                    value={creatorForm.name}
                    onChange={(e) => setCreatorForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </label>
                <label className="field">
                  <span className="fieldLabel">Profile URL</span>
                  <input
                    placeholder="https://x.com/username"
                    value={creatorForm.url}
                    onChange={(e) => setCreatorForm((prev) => ({ ...prev, url: e.target.value }))}
                  />
                </label>
                <label className="field">
                  <span className="fieldLabel">Platform</span>
                  <select
                    value={creatorForm.platform}
                    onChange={(e) =>
                      setCreatorForm((prev) => ({ ...prev, platform: e.target.value }))
                    }
                  >
                    <option value="twitter">Twitter / X</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                </label>
                <button type="submit">Add Competitor</button>
              </form>
            </article>

            <article className="card">
              <div className="sectionHead">
                <h3>Knowledge Base</h3>
                <p>Add reference posts to steer tone and format.</p>
              </div>

              <form className="form" onSubmit={addLibraryItem}>
                <div className="row">
                  <label className="field">
                    <span className="fieldLabel">Platform</span>
                    <select
                      value={itemForm.platform}
                      onChange={(e) =>
                        setItemForm((prev) => ({ ...prev, platform: e.target.value }))
                      }
                    >
                      <option value="twitter">Twitter / X</option>
                      <option value="linkedin">LinkedIn</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="fieldLabel">Source (optional)</span>
                    <input
                      placeholder="Post URL or author"
                      value={itemForm.source}
                      onChange={(e) =>
                        setItemForm((prev) => ({ ...prev, source: e.target.value }))
                      }
                    />
                  </label>
                </div>
                <label className="field">
                  <span className="fieldLabel">Reference Post</span>
                  <textarea
                    placeholder="Paste a high-performing post..."
                    value={itemForm.text}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, text: e.target.value }))}
                  />
                </label>
                <button type="submit">Add Reference Post</button>
              </form>
            </article>

            <article className="card fullWidth">
              <div className="sectionHead">
                <h3>Manual Generator</h3>
                <p>Create controlled drafts with custom briefing.</p>
              </div>

              <form className="form" onSubmit={generate}>
                <div className="row row-tight">
                  <label className="field">
                    <span className="fieldLabel">Platform</span>
                    <select
                      value={genForm.platform}
                      onChange={(e) => {
                        const platform = e.target.value;
                        setGenForm((prev) => ({ ...prev, platform }));
                        fetchItems(platform).catch(() => {});
                      }}
                    >
                      <option value="twitter">Twitter / X</option>
                      <option value="linkedin">LinkedIn</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="fieldLabel">Variants</span>
                    <input
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
                  </label>
                </div>

                <label className="field">
                  <span className="fieldLabel">Brief</span>
                  <textarea
                    placeholder="What should this post communicate?"
                    value={genForm.brief}
                    onChange={(e) => setGenForm((prev) => ({ ...prev, brief: e.target.value }))}
                  />
                </label>

                <div className="row">
                  <label className="field">
                    <span className="fieldLabel">Audience (optional)</span>
                    <input
                      placeholder="Who is this for?"
                      value={genForm.audience}
                      onChange={(e) => setGenForm((prev) => ({ ...prev, audience: e.target.value }))}
                    />
                  </label>
                  <label className="field">
                    <span className="fieldLabel">Goal (optional)</span>
                    <input
                      placeholder="What action should they take?"
                      value={genForm.goal}
                      onChange={(e) => setGenForm((prev) => ({ ...prev, goal: e.target.value }))}
                    />
                  </label>
                </div>

                <label className="field">
                  <span className="fieldLabel">Call to Action (optional)</span>
                  <input
                    placeholder="Reply, DM, visit site, book a call..."
                    value={genForm.callToAction}
                    onChange={(e) => setGenForm((prev) => ({ ...prev, callToAction: e.target.value }))}
                  />
                </label>

                <button type="submit" disabled={loading.generate}>
                  {loading.generate ? "Generating..." : "Generate Posts"}
                </button>
              </form>

              <div className="output">
                {posts.map((post, idx) => (
                  <div key={`${idx}-${post.hook}`} className="item outputCard">
                    <strong>{post.hook || `Draft ${idx + 1}`}</strong>
                    <pre>{post.post}</pre>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}
