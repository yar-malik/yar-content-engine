"use client";

import { useEffect, useMemo, useState } from "react";

export default function HomePage() {
  const [creators, setCreators] = useState([]);
  const [items, setItems] = useState([]);
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState({ creators: false, items: false, generate: false });

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

  async function refreshAll(platform = genForm.platform) {
    setLoading((prev) => ({ ...prev, creators: true, items: true }));
    try {
      await Promise.all([fetchCreators(), fetchItems(platform)]);
    } catch (error) {
      setStatus({ error: error.message || "Failed loading data", success: "" });
    } finally {
      setLoading((prev) => ({ ...prev, creators: false, items: false }));
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

  return (
    <div className="page">
      <div className="shell">
        <header className="hero">
          <h1>Content Engine</h1>
          <p>
            Add creator sources, build your reference library, and generate post drafts with
            GPT-4o mini.
          </p>
        </header>

        <section className="grid">
          <article className="card span-4">
            <h2>Creator Sources</h2>
            <p>Save your favorite X and LinkedIn creators as reusable inspiration sources.</p>

            <form className="form" onSubmit={addCreator}>
              <input
                placeholder="Creator name"
                value={creatorForm.name}
                onChange={(e) => setCreatorForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                placeholder="https://x.com/username"
                value={creatorForm.url}
                onChange={(e) => setCreatorForm((prev) => ({ ...prev, url: e.target.value }))}
              />
              <select
                value={creatorForm.platform}
                onChange={(e) =>
                  setCreatorForm((prev) => ({ ...prev, platform: e.target.value }))
                }
              >
                <option value="twitter">Twitter / X</option>
                <option value="linkedin">LinkedIn</option>
              </select>
              <button type="submit">Add Creator</button>
            </form>

            <div className="list">
              {loading.creators && <div className="item">Loading creators...</div>}
              {!loading.creators && creators.length === 0 && (
                <div className="item">No creators yet.</div>
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
            <h2>Reference Library</h2>
            <p>Add seed posts to teach tone and format to the generator.</p>

            <form className="form" onSubmit={addLibraryItem}>
              <div className="row">
                <select
                  value={itemForm.platform}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, platform: e.target.value }))}
                >
                  <option value="twitter">Twitter / X</option>
                  <option value="linkedin">LinkedIn</option>
                </select>
                <input
                  placeholder="Source (optional)"
                  value={itemForm.source}
                  onChange={(e) => setItemForm((prev) => ({ ...prev, source: e.target.value }))}
                />
              </div>
              <textarea
                placeholder="Paste a high-performing post..."
                value={itemForm.text}
                onChange={(e) => setItemForm((prev) => ({ ...prev, text: e.target.value }))}
              />
              <button type="submit">Add Reference Post</button>
            </form>

            <div className="list">
              {loading.items && <div className="item">Loading posts...</div>}
              {!loading.items && filteredItems.length === 0 && (
                <div className="item">No posts for {genForm.platform} yet.</div>
              )}
              {filteredItems.map((item) => (
                <div className="item" key={item.id}>
                  <strong>{item.text.slice(0, 120)}{item.text.length > 120 ? "..." : ""}</strong>
                  <div className="meta">
                    <span className="tag">{item.platform}</span>
                    <span>{item.source || "manual"}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="card span-12">
            <h2>Generate Posts</h2>
            <p>Write a brief and generate platform-ready drafts.</p>

            <form className="form" onSubmit={generate}>
              <div className="row">
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
              </div>

              <textarea
                placeholder="Brief (required): what should this post communicate?"
                value={genForm.brief}
                onChange={(e) => setGenForm((prev) => ({ ...prev, brief: e.target.value }))}
              />

              <div className="row">
                <input
                  placeholder="Audience (optional)"
                  value={genForm.audience}
                  onChange={(e) => setGenForm((prev) => ({ ...prev, audience: e.target.value }))}
                />
                <input
                  placeholder="Goal (optional)"
                  value={genForm.goal}
                  onChange={(e) => setGenForm((prev) => ({ ...prev, goal: e.target.value }))}
                />
              </div>

              <input
                placeholder="Call to action (optional)"
                value={genForm.callToAction}
                onChange={(e) =>
                  setGenForm((prev) => ({ ...prev, callToAction: e.target.value }))
                }
              />

              <button type="submit" disabled={loading.generate}>
                {loading.generate ? "Generating..." : "Generate Posts"}
              </button>
            </form>

            {status.error && <p className="error">{status.error}</p>}
            {status.success && <p className="success">{status.success}</p>}

            <div className="output">
              {posts.map((post, idx) => (
                <div key={`${idx}-${post.hook}`} className="item">
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
