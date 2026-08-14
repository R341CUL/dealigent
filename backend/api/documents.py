"""
Data-room document ingestion.
Upload PDF / TXT / MD files against a deal; text is extracted, chunked and embedded
into the ChromaDB corpus tagged with the deal's target company, so the 6 DD agents
retrieve and cite them (grounding upgrades from 'model knowledge' to 'proprietary corpus').
"""
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db
from core.models import Deal
from agents.rag import ingest_document, list_documents, delete_document

router = APIRouter(prefix="/api/documents", tags=["documents"])

MAX_BYTES = 15 * 1024 * 1024  # 15 MB per file
ALLOWED = {".pdf", ".txt", ".md", ".markdown", ".csv"}


def _extract_text(filename: str, data: bytes) -> str:
    name = filename.lower()
    if name.endswith(".pdf"):
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(data))
            return "\n".join((page.extract_text() or "") for page in reader.pages)
        except Exception as e:
            raise HTTPException(422, f"Could not read PDF: {str(e)[:120]}")
    # text-like formats
    for enc in ("utf-8", "latin-1"):
        try:
            return data.decode(enc)
        except Exception:
            continue
    raise HTTPException(422, "Could not decode text file")


async def _deal_dict(deal_id: str, db: AsyncSession) -> dict:
    res = await db.execute(select(Deal).where(Deal.id == deal_id))
    deal = res.scalar_one_or_none()
    if not deal:
        raise HTTPException(404, "Deal not found")
    return {"id": deal.id, "targetCompany": deal.target, "target": deal.target}


@router.post("/{deal_id}/upload")
async def upload_document(deal_id: str, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    deal = await _deal_dict(deal_id, db)

    ext = "." + (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if ext not in ALLOWED:
        raise HTTPException(415, f"Unsupported type '{ext or '?'}'. Allowed: PDF, TXT, MD, CSV.")

    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "File exceeds 15 MB limit")

    text = _extract_text(file.filename, data)
    if len(text.strip()) < 40:
        raise HTTPException(422, "No extractable text found (scanned image PDFs are not supported)")

    chunks = ingest_document(deal, file.filename, text)
    if chunks == 0:
        raise HTTPException(422, "Document produced no indexable content")

    return {
        "filename": file.filename,
        "chunks": chunks,
        "chars": len(text),
        "documents": list_documents(deal_id),
    }


@router.get("/{deal_id}")
async def get_documents(deal_id: str):
    return {"documents": list_documents(deal_id)}


@router.delete("/{deal_id}")
async def remove_document(deal_id: str, source: str):
    removed = delete_document(deal_id, source)
    return {"removed": removed, "documents": list_documents(deal_id)}
