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
  const [discoveryMeta, setDiscoveryMeta] = useState({ fetchedAt: "" });
  const [status, setStatus] = useState({ error: "", success: "" });
  const [loading, setLoading] = useState({ creators: false, items: false, generate: false, autoContent: false });

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
    <div className="min-h-screen bg-muted/40">
      <div className="grid min-h-screen md:grid-cols-[220px_1fr]">
        <aside className="border-r bg-background">
          <div className="flex h-full flex-col gap-4 p-4">
            <div className="text-sm font-semibold">Acme Inc.</div>
            <Button className="justify-start" onClick={getNewPosts} disabled={loading.autoContent}>
              {loading.autoContent ? "Working..." : "Quick Create"}
            </Button>
            <div className="space-y-1 text-sm">
              <div className="rounded-md bg-primary px-3 py-2 text-primary-foreground">Dashboard</div>
              <div className="rounded-md px-3 py-2 text-muted-foreground">Knowledge Base</div>
              <div className="rounded-md px-3 py-2 text-muted-foreground">Competitors</div>
              <div className="rounded-md px-3 py-2 text-muted-foreground">LinkedIn Twitter</div>
              <div className="rounded-md px-3 py-2 text-muted-foreground">Lead Magnets</div>
            </div>
            <div className="mt-auto text-xs text-muted-foreground">
              {discoveryMeta.fetchedAt ? `Updated ${new Date(discoveryMeta.fetchedAt).toLocaleString()}` : "No updates"}
            </div>
          </div>
        </aside>

        <main className="p-4 md:p-6">
          <div className="rounded-lg border bg-background">
            <div className="flex items-center justify-between border-b px-4 py-3 text-sm">
              <div className="font-medium">Documents</div>
              <div className="text-muted-foreground">GitHub</div>
            </div>

            <div className="space-y-4 p-4">
              {(status.error || status.success) && (
                <div className="rounded-md border px-3 py-2 text-sm">
                  {status.error || status.success}
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                  <Card key={stat.label}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-semibold tracking-tight">{stat.value}</div>
                      <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle>Total Visitors</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">Last 3 months</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Last 3 months</Button>
                    <Button variant="outline" size="sm">Last 30 days</Button>
                    <Button variant="outline" size="sm">Last 7 days</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-56 rounded-md border bg-muted/40" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary">Outline</Button>
                    <Button size="sm" variant="ghost">Past Performance</Button>
                    <Button size="sm" variant="ghost">Key Personnel</Button>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">Customize Columns</Button>
                    <Button size="sm" variant="outline">Add Section</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-muted-foreground">
                        <tr className="border-b">
                          <th className="py-2 pr-3 font-medium">Title</th>
                          <th className="py-2 pr-3 font-medium">Platform</th>
                          <th className="py-2 pr-3 font-medium">Status</th>
                          <th className="py-2 font-medium">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {autoPosts.slice(0, 8).map((post) => (
                          <tr key={post.id} className="border-b last:border-b-0">
                            <td className="py-2 pr-3">{post.hook || "Draft"}</td>
                            <td className="py-2 pr-3">{post.platform}</td>
                            <td className="py-2 pr-3">Ready</td>
                            <td className="py-2">Auto</td>
                          </tr>
                        ))}
                        {autoPosts.length === 0 && (
                          <tr>
                            <td className="py-3 text-muted-foreground" colSpan={4}>No rows yet</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-3 lg:grid-cols-2">
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
                      <Button type="submit">Add</Button>
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
                      <Button type="submit">Add</Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader><CardTitle>Manual Generator</CardTitle></CardHeader>
                <CardContent>
                  <form className="space-y-2" onSubmit={generate}>
                    <div className="grid gap-2 md:grid-cols-2">
                      <Select value={genForm.platform} onChange={(e) => { const platform = e.target.value; setGenForm((prev) => ({ ...prev, platform })); fetchItems(platform).catch(() => {}); }}>
                        <option value="twitter">Twitter / X</option>
                        <option value="linkedin">LinkedIn</option>
                      </Select>
                      <Input type="number" min={1} max={10} value={genForm.variants} onChange={(e) => setGenForm((prev) => ({ ...prev, variants: Math.max(1, Math.min(Number(e.target.value || 1), 10)) }))} />
                    </div>
                    <Textarea placeholder="Brief" value={genForm.brief} onChange={(e) => setGenForm((prev) => ({ ...prev, brief: e.target.value }))} />
                    <div className="grid gap-2 md:grid-cols-2">
                      <Input placeholder="Audience" value={genForm.audience} onChange={(e) => setGenForm((prev) => ({ ...prev, audience: e.target.value }))} />
                      <Input placeholder="Goal" value={genForm.goal} onChange={(e) => setGenForm((prev) => ({ ...prev, goal: e.target.value }))} />
                    </div>
                    <Input placeholder="CTA" value={genForm.callToAction} onChange={(e) => setGenForm((prev) => ({ ...prev, callToAction: e.target.value }))} />
                    <Button type="submit" disabled={loading.generate}>{loading.generate ? "Generating..." : "Generate"}</Button>
                  </form>

                  <Separator className="my-4" />

                  <div className="space-y-2">
                    {posts.map((post, idx) => (
                      <div key={`${idx}-${post.hook}`} className="rounded-md border bg-muted/40 p-3">
                        <strong className="text-sm">{post.hook || `Draft ${idx + 1}`}</strong>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{post.post}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
