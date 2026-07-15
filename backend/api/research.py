import asyncio
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from agents.research.runner import run_research

router = APIRouter(prefix="/api/research", tags=["research"])


class ResearchRequest(BaseModel):
    company:  str
    country:  str = "India"
    acquirer: str = ""


@router.post("/stream")
async def stream_research(req: ResearchRequest):
    queue: asyncio.Queue = asyncio.Queue()

    async def generate():
        task = asyncio.create_task(
            run_research(req.company, req.country, req.acquirer, queue)
        )
        try:
            while True:
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=120.0)
                except asyncio.TimeoutError:
                    yield "event: error\ndata: {\"message\": \"research timeout\"}\n\n"
                    break
                yield f"event: {item['type']}\ndata: {json.dumps(item)}\n\n"
                if item["type"] == "done":
                    break
        finally:
            if not task.done():
                task.cancel()

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
