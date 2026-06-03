import chromadb
from chromadb.config import Settings
from agents.corpus import PERSONIO_CORPUS
from core.config import settings as app_settings

_client: chromadb.ClientAPI | None = None
_collection = None

PERSONIO_COMPANY = "Personio GmbH"


def get_chroma():
    global _client, _collection
    if _client is None:
        _client = chromadb.PersistentClient(
            path=app_settings.chroma_persist_dir,
            settings=Settings(anonymized_telemetry=False),
        )
        _collection = _client.get_or_create_collection(
            name="dealigent_corpus",
            metadata={"hnsw:space": "cosine"},
        )
        _seed_personio()
    return _collection


def _seed_personio():
    """Seed the Personio demo corpus tagged with its company so it never leaks to other deals."""
    # Migration: if existing Personio docs lack a company tag, re-tag them.
    try:
        existing = _collection.get(ids=[doc["id"] for doc in PERSONIO_CORPUS])
        existing_ids = set(existing.get("ids") or [])
        needs_seed = len(existing_ids) < len(PERSONIO_CORPUS)
        # check first existing doc has company metadata
        metas = existing.get("metadatas") or []
        needs_migrate = bool(metas) and not metas[0].get("company")
    except Exception:
        needs_seed, needs_migrate = True, False

    if needs_migrate:
        _collection.delete(ids=[doc["id"] for doc in PERSONIO_CORPUS])
        needs_seed = True

    if needs_seed:
        _collection.upsert(
            ids=[doc["id"] for doc in PERSONIO_CORPUS],
            documents=[doc["text"] for doc in PERSONIO_CORPUS],
            metadatas=[{"pillar": doc["pillar"], "company": PERSONIO_COMPANY} for doc in PERSONIO_CORPUS],
        )


def _chunk_text(text: str, size: int = 1000, overlap: int = 150) -> list[str]:
    """Split raw document text into overlapping chunks on paragraph/whitespace boundaries."""
    text = " ".join((text or "").split())
    if not text:
        return []
    chunks, start, n = [], 0, len(text)
    while start < n:
        end = min(start + size, n)
        # try to break on a sentence/space boundary near the end
        if end < n:
            brk = text.rfind(". ", start + int(size * 0.6), end)
            if brk == -1:
                brk = text.rfind(" ", start + int(size * 0.6), end)
            if brk != -1:
                end = brk + 1
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= n:
            break
        start = max(end - overlap, start + 1)
    return chunks


def ingest_document(deal: dict, filename: str, text: str) -> int:
    """
    Chunk + embed an uploaded data-room document into the corpus, tagged with the
    deal's target company so it surfaces in every pillar's retrieval (pillar='general').
    Returns the number of chunks stored.
    """
    company = deal.get("targetCompany") or deal.get("target") or ""
    deal_id = deal.get("id") or ""
    if not company:
        return 0
    col = get_chroma()
    chunks = _chunk_text(text)
    if not chunks:
        return 0
    safe = "".join(c if c.isalnum() else "_" for c in filename)[:60]
    ids   = [f"{deal_id}__{safe}__{i}" for i in range(len(chunks))]
    metas = [{"company": company, "pillar": "general", "source": filename, "deal_id": deal_id}
             for _ in chunks]
    col.upsert(ids=ids, documents=chunks, metadatas=metas)
    return len(chunks)


def list_documents(deal_id: str) -> list[dict]:
    """Return uploaded data-room docs for a deal, aggregated by source filename."""
    if not deal_id:
        return []
    col = get_chroma()
    try:
        res = col.get(where={"deal_id": {"$eq": deal_id}})
    except Exception:
        return []
    from collections import Counter
    counts = Counter((m or {}).get("source", "?") for m in (res.get("metadatas") or []))
    return [{"source": src, "chunks": n} for src, n in sorted(counts.items())]


def delete_document(deal_id: str, source: str) -> int:
    """Remove all chunks for one uploaded document. Returns chunks removed."""
    col = get_chroma()
    try:
        res = col.get(where={"$and": [{"deal_id": {"$eq": deal_id}}, {"source": {"$eq": source}}]})
        ids = res.get("ids") or []
        if ids:
            col.delete(ids=ids)
        return len(ids)
    except Exception:
        return 0


def query_context(pillar: str, deal: dict, n_results: int = 4) -> list[str]:
    """
    Retrieve corpus chunks for THIS company + pillar only.
    Never returns another company's data — if the target has no seeded
    pillar corpus, returns [] so the LLM relies on its own knowledge + the
    real deal/financial context instead of leaking the demo company's profile.
    """
    col = get_chroma()
    company = deal.get("targetCompany") or deal.get("target") or ""
    query_text = f"{pillar} due diligence {company} {deal.get('sector', '')}"

    # Match this company's pillar corpus PLUS any uploaded data-room docs (tagged "general").
    where = {"$and": [
        {"company": {"$eq": company}},
        {"$or": [{"pillar": {"$eq": pillar}}, {"pillar": {"$eq": "general"}}]},
    ]}
    try:
        results = col.query(
            query_texts=[query_text],
            n_results=min(n_results, max(col.count(), 1)),
            where=where,
        )
        docs = results["documents"][0] if results.get("documents") else []
        return docs
    except Exception:
        try:
            results = col.get(where=where)
            return (results.get("documents") or [])[:n_results]
        except Exception:
            return []
