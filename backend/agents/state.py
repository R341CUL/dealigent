from typing import TypedDict, Optional, Annotated
import operator

class PillarOutput(TypedDict):
    pillar:    str
    score:     float
    summary:   str
    findings:  list[dict]
    red_flags: list[dict]
    raw:       str

class DDState(TypedDict):
    deal:            dict
    enabled_pillars: list[str]
    pillar_outputs:  Annotated[list[PillarOutput], operator.add]
    overall_score:   Optional[float]
    verdict:         Optional[str]
    error:           Optional[str]
