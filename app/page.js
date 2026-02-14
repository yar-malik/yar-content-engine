"use client";

import { useEffect, useMemo, useState } from "react";

export default function HomePage() {
  const [creators, setCreators] = useState([]);
  const [items, setItems] = useState([]);
  const [posts, setPosts] = useState([]);
  const [viralTopics, setViralTopics] = useState([]);
  const [leadMagnets, setLeadMagnets] = useState([]);
  const [discoveryMeta, setDiscoveryMeta] = useState({ fetchedAt: "" });
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState({
    creators: false,
    items: false,
    generate: false,
    discovery: false,
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

  async function fetchDiscovery() {
    const res = await fetch("/api/discovery", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load discovery data");
    setViralTopics(data.viralTopics || []);
    setLeadMagnets(data.leadMagnets || []);
    setDiscoveryMeta({ fetchedAt: data.fetchedAt || "" });
  }

  async function refreshDiscovery() {
    setStatus({ error: "", success: "" });
    setLoading((prev) => ({ ...prev, discovery: true }));

    try {
      const res = await fetch("/api/discovery", {
        method: "POST",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to refresh discovery data");
      setViralTopics(data.viralTopics || []);
      setLeadMagnets(data.leadMagnets || []);
      setDiscoveryMeta({ fetchedAt: data.fetchedAt || "" });
      setStatus({
        error: "",
        success: `Updated trend feed with ${data.viralTopics?.length || 0} viral topics and ${data.leadMagnets?.length || 0} lead magnets.`,
      });
    } catch (error) {
      setStatus({ error: error.message || "Failed to refresh discovery data", success: "" });
    } finally {
      setLoading((prev) => ({ ...prev, discovery: false }));
    }
  }

  async function refreshAll(platform = genForm.platform) {
    setLoading((prev) => ({ ...prev, creators: true, items: true, discovery: true }));
    try {
      await Promise.all([fetchCreators(), fetchItems(platform), fetchDiscovery()]);
    } catch (error) {
      setStatus({ error: error.message || "Failed loading data", success: "" });
    } finally {
      setLoading((prev) => ({ ...prev, creators: false, items: false, discovery: false }));
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredItems = useMemo(
    () => items.filter((item) => item.platform === genForm.platform),
    [items, genForm.platform]
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

  const platformLabel = genForm.platform === "linkedin" ? "LinkedIn" : "Twitter / X";

  return (
    <div className="page">
      <div className="shell">
        <header className="hero">
          <div>
            <p className="eyebrow">Social Workflow</p>
            <h1>Content Engine</h1>
            <p>
              Capture strong creator examples, curate reusable references, and generate clear
              platform-native drafts.
            </p>
          </div>
          <div className="heroStats">
            <div className="stat">
              <span>Creators</span>
              <strong>{creators.length}</strong>
            </div>
            <div className="stat">
              <span>References</span>
              <strong>{filteredItems.length}</strong>
            </div>
            <div className="stat">
              <span>Platform</span>
              <strong>{platformLabel}</strong>
            </div>
            <div className="stat">
              <span>Viral Signals</span>
              <strong>{viralTopics.length}</strong>
            </div>
          </div>
        </header>

        {(status.error || status.success) && (
          <div className={`statusBanner ${status.error ? "error" : "success"}`}>
            {status.error || status.success}
          </div>
        )}

        <section className="grid">
          <article className="card span-12">
            <div className="sectionHead">
              <h2>Viral Discovery + Lead Magnets</h2>
              <p>
                Auto-finds high-engagement AI, AI Automation, and OpenClaw-related trends and
                creates assignable lead magnet drafts for the team.
              </p>
            </div>
            <div className="row actionsRow">
              <button
                type="button"
                className="secondaryButton"
                onClick={refreshDiscovery}
                disabled={loading.discovery}
              >
                {loading.discovery ? "Refreshing Trends..." : "Refresh Viral Feed"}
              </button>
              <div className="lastUpdated">
                Last refresh:{" "}
                {discoveryMeta.fetchedAt
                  ? new Date(discoveryMeta.fetchedAt).toLocaleString()
                  : "Not refreshed yet"}
              </div>
            </div>

            <div className="row splitRows">
              <div>
                <h3 className="subhead">Viral Content Signals</h3>
                <div className="list">
                  {!loading.discovery && viralTopics.length === 0 && (
                    <div className="item muted">
                      No trend data yet. Click &quot;Refresh Viral Feed&quot; to pull live market
                      signals.
                    </div>
                  )}
                  {viralTopics.map((topic) => (
                    <div className="item" key={topic.id}>
                      <strong>{topic.title}</strong>
                      <div className="meta">
                        <span className="tag">{topic.source}</span>
                        <span>Score: {Number(topic.score || 0).toFixed(1)}</span>
                        <span>Engagement: {Math.round(topic.engagement || 0)}</span>
                      </div>
                      <p className="inlineSummary">{topic.summary}</p>
                      {topic.url && (
                        <a href={topic.url} target="_blank" rel="noreferrer">
                          Open source
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="subhead">Generated Lead Magnets</h3>
                <div className="list">
                  {!loading.discovery && leadMagnets.length === 0 && (
                    <div className="item muted">
                      No lead magnets yet. Refresh the feed to auto-generate them.
                    </div>
                  )}
                  {leadMagnets.map((magnet) => (
                    <div className="item" key={magnet.id}>
                      <strong>{magnet.title}</strong>
                      <div className="meta">
                        <span className="tag">{magnet.type}</span>
                        <span>Assigned: {magnet.assignedTo}</span>
                      </div>
                      <p className="inlineSummary">{magnet.hook}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>

          <article className="card span-4">
            <div className="sectionHead">
              <h2>Creator Sources</h2>
              <p>Track trusted voices to keep your ideas grounded in real-world examples.</p>
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
              <button type="submit">Add Creator</button>
            </form>

            <div className="list">
              {loading.creators && <div className="item muted">Loading creators...</div>}
              {!loading.creators && creators.length === 0 && (
                <div className="item muted">No creators yet.</div>
              )}
              {creators.map((creator) => (
                <div className="item" key={creator.id}>
                  <strong>{creator.name}</strong>
                  <div className="meta">
                    <span className="tag">{creator.platform}</span>
                    <a href={creator.url} target="_blank" rel="noreferrer">
                      Open source
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="card span-8">
            <div className="sectionHead">
              <h2>Reference Library</h2>
              <p>Save high-performing posts so the generator can mirror tone and structure.</p>
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

            <div className="list">
              {loading.items && <div className="item muted">Loading posts...</div>}
              {!loading.items && filteredItems.length === 0 && (
                <div className="item muted">No posts for {genForm.platform} yet.</div>
              )}
              {filteredItems.map((item) => (
                <div className="item" key={item.id}>
                  <strong>
                    {item.text.slice(0, 140)}
                    {item.text.length > 140 ? "..." : ""}
                  </strong>
                  <div className="meta">
                    <span className="tag">{item.platform}</span>
                    <span>{item.source || "manual"}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="card span-12">
            <div className="sectionHead">
              <h2>Generate Posts</h2>
              <p>Write a focused prompt and produce clean drafts in one step.</p>
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
      </div>
    </div>
  );
}
