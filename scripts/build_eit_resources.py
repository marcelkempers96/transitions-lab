"""
Build the two downloadable artefacts offered on
/european-impact-tracking:

  - assets/resource-eit-tracking-template.xlsx
  - assets/resource-eit-tracking-template.pdf

Run from the project root:

    python3 scripts/build_eit_resources.py

The script writes directly into assets/. The .xlsx is a fillable
template with long-form rationale on every sheet, formulas that roll
each indicator up to the Reach / Depth / Experience framework and
then to a Societal Readiness Level summary, plus a fully worked
example sheet. The .pdf is a typeset version of the method,
suitable for a funder to read in one sitting.

The script is idempotent: re-running overwrites both files in place.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Local pip packages may not be on sys.path depending on how the
# interpreter was invoked, so make sure the system site-packages
# directory is reachable before importing them.
for _p in (
    "/usr/local/lib/python3.13/dist-packages",
    "/usr/local/lib/python3.12/dist-packages",
    "/usr/lib/python3/dist-packages",
):
    if os.path.isdir(_p) and _p not in sys.path:
        sys.path.append(_p)

from openpyxl import Workbook
from openpyxl.styles import (
    Alignment,
    Border,
    Font,
    PatternFill,
    Side,
)
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.worksheet import Worksheet

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
XLSX_PATH = ASSETS / "resource-eit-tracking-template.xlsx"
PDF_PATH  = ASSETS / "resource-eit-tracking-template.pdf"

# ─── Design tokens matching the website palette ────────────────────────

INK = "1A1A1A"
PAPER = "F3EDE1"
BUTTER = "F3C98B"
PAPER_2 = "FBF7EC"
MUTE = "6B6457"
RULE = "D9D1BE"
COBALT = "3A4CA8"
SAGE = "A7B798"
WHITE = "FFFFFF"

# Dimension colour chips (soft, legible on cream)
C_REACH = "DFE6F2"      # soft slate for reach
C_DEPTH = "E6E2CF"      # oatmeal for depth
C_EXPERIENCE = "F2D7B8" # pale butter for experience


# ─── Shared cell styles ────────────────────────────────────────────────

thin = Side(style="thin", color=RULE)
BORDER_ALL = Border(left=thin, right=thin, top=thin, bottom=thin)

TITLE_FONT = Font(name="Calibri", size=20, bold=True, color=INK)
H2_FONT    = Font(name="Calibri", size=14, bold=True, color=INK)
LABEL_FONT = Font(name="Calibri", size=10, bold=True, color=INK)
MUTE_FONT  = Font(name="Calibri", size=10, color=MUTE)
BODY_FONT  = Font(name="Calibri", size=11, color=INK)
INPUT_FONT = Font(name="Calibri", size=11, color=INK)
EXAMPLE_FONT = Font(name="Calibri", size=11, italic=True, color=MUTE)

PAPER_FILL  = PatternFill("solid", fgColor=PAPER)
PAPER2_FILL = PatternFill("solid", fgColor=PAPER_2)
BUTTER_FILL = PatternFill("solid", fgColor=BUTTER)
RULE_FILL   = PatternFill("solid", fgColor=RULE)
HEAD_FILL   = PatternFill("solid", fgColor=INK)
HEAD_FONT   = Font(name="Calibri", size=11, bold=True, color=PAPER)

DIM_FILLS = {
    "reach": PatternFill("solid", fgColor=C_REACH),
    "depth": PatternFill("solid", fgColor=C_DEPTH),
    "experience": PatternFill("solid", fgColor=C_EXPERIENCE),
}

ALIGN_WRAP = Alignment(wrap_text=True, vertical="top")
ALIGN_WRAP_CENTER = Alignment(wrap_text=True, vertical="center", horizontal="center")
ALIGN_CENTER = Alignment(vertical="center", horizontal="center")


# ─── Helpers ──────────────────────────────────────────────────────────

def set_sheet_defaults(ws: Worksheet, widths: list[int], first_row_height: int = 36) -> None:
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.sheet_view.showGridLines = False
    ws.row_dimensions[1].height = first_row_height
    ws.sheet_view.zoomScale = 110


def write_title(ws: Worksheet, title: str, standfirst: str, span_cols: int) -> int:
    ws.merge_cells(start_row=1, end_row=1, start_column=1, end_column=span_cols)
    c = ws.cell(row=1, column=1, value=title)
    c.font = TITLE_FONT
    c.alignment = Alignment(vertical="center", horizontal="left")
    c.fill = PAPER_FILL

    ws.merge_cells(start_row=2, end_row=2, start_column=1, end_column=span_cols)
    c2 = ws.cell(row=2, column=1, value=standfirst)
    c2.font = MUTE_FONT
    c2.alignment = Alignment(wrap_text=True, vertical="top")
    ws.row_dimensions[2].height = 48
    return 3  # next free row


def write_rationale(ws: Worksheet, row: int, span_cols: int, heading: str, body: str) -> int:
    ws.merge_cells(start_row=row, end_row=row, start_column=1, end_column=span_cols)
    c = ws.cell(row=row, column=1, value=heading)
    c.font = H2_FONT
    c.alignment = Alignment(vertical="center", horizontal="left")
    row += 1

    ws.merge_cells(start_row=row, end_row=row, start_column=1, end_column=span_cols)
    c2 = ws.cell(row=row, column=1, value=body)
    c2.font = BODY_FONT
    c2.alignment = ALIGN_WRAP
    # Height: proportional to body length.
    lines = max(3, int(len(body) / (span_cols * 14)) + 2)
    ws.row_dimensions[row].height = lines * 15
    return row + 2


def write_table_header(ws: Worksheet, row: int, headers: list[str], widths: list[int] | None = None) -> int:
    for i, h in enumerate(headers, start=1):
        c = ws.cell(row=row, column=i, value=h)
        c.font = HEAD_FONT
        c.fill = HEAD_FILL
        c.alignment = Alignment(vertical="center", horizontal="left", wrap_text=True)
        c.border = BORDER_ALL
    ws.row_dimensions[row].height = 30
    return row + 1


def write_table_rows(ws: Worksheet, start_row: int, rows: list[list], example: bool = False) -> int:
    row = start_row
    font = EXAMPLE_FONT if example else INPUT_FONT
    for data_row in rows:
        for i, val in enumerate(data_row, start=1):
            c = ws.cell(row=row, column=i, value=val)
            c.font = font
            c.alignment = ALIGN_WRAP
            c.border = BORDER_ALL
        ws.row_dimensions[row].height = 28
        row += 1
    return row


def section_break(ws: Worksheet, row: int, span_cols: int) -> int:
    ws.merge_cells(start_row=row, end_row=row, start_column=1, end_column=span_cols)
    ws.row_dimensions[row].height = 10
    return row + 1


def note_row(ws: Worksheet, row: int, span_cols: int, text: str) -> int:
    ws.merge_cells(start_row=row, end_row=row, start_column=1, end_column=span_cols)
    c = ws.cell(row=row, column=1, value=text)
    c.font = Font(name="Calibri", size=10, italic=True, color=MUTE)
    c.alignment = ALIGN_WRAP
    ws.row_dimensions[row].height = max(26, int(len(text) / 90) * 18 + 20)
    return row + 2


# ─── Sheet builders ───────────────────────────────────────────────────

def build_readme(wb: Workbook) -> None:
    ws = wb.active
    ws.title = "README"
    set_sheet_defaults(ws, [20, 36, 36, 24, 20, 20], first_row_height=42)

    row = write_title(
        ws,
        "European Project Impact-Tracking Template",
        (
            "Independent before-and-after impact measurement for a European project, "
            "demonstration or socially innovative action, set up at the start, run while "
            "the work is live, closed out with proof. Transitions Lab, open methodology."
        ),
        span_cols=6,
    )

    row = write_rationale(
        ws, row, 6,
        "What this workbook is for",
        (
            "A European project is funded on the promise of a change: a change in "
            "behaviour, in capability, in a system, in the lived experience of a specific "
            "group of people. The gap between that promise and what the project can "
            "credibly report at the end is usually not a lack of effort. It is a lack of "
            "a measurement architecture that was set up at the beginning. By the time a "
            "deliverable is due, the \"before\" has been forgotten and the \"after\" is a "
            "reconstruction from memory and output counts.\n\n"
            "This workbook is the architecture, in one file. It takes you through the "
            "same instruments the Transitions Lab runs on its own measurement engagements: "
            "an impact claim stated so plainly a reader could disagree with it; an "
            "activity-to-impact pathway that is explicit about the assumptions underneath; "
            "a small, mixed indicator set that cannot be gamed by headcount; a baseline "
            "captured against the same instrument that will be used at the end; midline "
            "readings while there is still time to act on them; a lived-experience pulse "
            "that lets the people the project affects speak back in a structured way; and "
            "a close-out that is honest about what the evidence does and does not say."
        ),
    )

    row = write_rationale(
        ws, row, 6,
        "The one thing to understand before you fill anything in",
        (
            "The template treats \"impact\" as a change in three dimensions, not as a "
            "single number.\n\n"
            "Reach is who is actually being affected, and who is being left out. If a "
            "project reports 10,000 people reached but cannot say which 10,000 or who did "
            "not get in, reach is unreported.\n\n"
            "Depth is how materially the lives, work or systems in question actually "
            "change beyond the fact of being counted. A workshop attended is not a change; "
            "a decision taken differently afterwards is.\n\n"
            "Experience is what the change feels like, from the inside, to the people "
            "going through it. It is where friction lives, and where the project learns "
            "the thing it would not otherwise know.\n\n"
            "Every indicator in this template is tagged with exactly one of these three "
            "dimensions, every table rolls up into them, and the final readiness-level "
            "summary at the end is built directly from how far each dimension has moved. "
            "If a project ends with strong reach, weak depth and absent experience data, "
            "the summary will say so, cleanly, in a way a funder review can hold."
        ),
    )

    row = write_rationale(
        ws, row, 6,
        "How to use this workbook, in the order it was written",
        (
            "The sheets are numbered to match the project timeline, not for ornament.\n\n"
            "At kick-off, before any activity happens, complete A1 to A5. Those sheets "
            "are the only place where \"before\" is captured, and they cannot be filled "
            "in later without rounding and guessing. Treat A5 (Baseline) as the single "
            "most important sheet in this document.\n\n"
            "While the project is live, run B1, B2 and B3 at each agreed midpoint. The "
            "point of a midline is not to produce an interim report; it is to catch what "
            "is working and what is not while there is still time to act on it. "
            "A midline reading that changes nothing was not worth collecting.\n\n"
            "At close-out, complete C1, C2 and C3. These sheets are explicitly designed "
            "to allow the project to be truthful about the parts the evidence does not "
            "support, which is also what makes the parts it does support credible.\n\n"
            "Sheets D1 to D3 are set once and reused throughout: a fixed definition for "
            "every indicator, the sampling and consent approach, and a cross-site "
            "comparison layout that lets more than one pilot read side by side rather "
            "than as a pile of separate reports.\n\n"
            "Sheet E names who owns each step and how often it runs. It exists because "
            "a measurement framework without named owners quietly becomes nobody's job.\n\n"
            "The Rollup sheet aggregates indicators by dimension. The Readiness sheet "
            "produces a Societal Readiness Level claim grounded in that rollup. The "
            "Example sheet shows the whole workbook filled in for a real-shape project, "
            "so you can see the discipline before you start."
        ),
    )

    row = write_rationale(
        ws, row, 6,
        "What this template is not",
        (
            "This is not a monitoring system that runs itself, and it is not a replacement "
            "for independent measurement. A project can fill in every field here and still "
            "be measuring itself, which strains credibility by construction. Where the "
            "template is operated as the Lab's independent impact function inside a "
            "consortium, the sheets become source evidence for an external report that a "
            "funder can rely on. Where it is handed to a partner to run, the Lab remains "
            "available to review the baseline (A5), the indicator mix (A4) and the "
            "close-out verdicts (C2), which is where self-assessment goes wrong most "
            "often. Nothing in this template is a substitute for actually reaching the "
            "people a project affects and asking them what changed."
        ),
    )

    row = write_rationale(
        ws, row, 6,
        "Legend used in the sheets",
        (
            "Headers in dark ink are instrument sections. Rows highlighted in soft slate, "
            "oatmeal, or pale butter indicate the dimension (reach, depth, experience) "
            "an indicator belongs to. Italic grey text is example copy; replace it. Blue "
            "cells are formulas; they update as you type and should not be overwritten "
            "unless you have a specific reason."
        ),
    )

    # Credits footer
    note_row(ws, row + 1, 6, (
        "Open methodology · Transitions Lab · transitionslab.org · "
        "Please cite as: Transitions Lab (2026), European Project Impact-Tracking Template."
    ))


def build_a1_identity(wb: Workbook) -> None:
    ws = wb.create_sheet("A1. Project identity")
    set_sheet_defaults(ws, [32, 60], first_row_height=36)

    row = write_title(ws, "A1 — Project identity",
                      "A compact header the rest of the workbook refers back to. Complete at kick-off.", 2)

    row = write_rationale(ws, row, 2, "Why this sheet exists", (
        "The project's own metadata is the easiest field to leave until later and the "
        "hardest to reconstruct cleanly when a funder review arrives. The deliverable "
        "number, the call reference, the pilot sites and the reporting window show up "
        "in every subsequent sheet, every chart in the close-out report, and the final "
        "attribution notice on anything made public. Fill it once, here, and the rest "
        "of the workbook is self-identifying."
    ))

    row = write_table_header(ws, row, ["Field", "Entry"])
    identity_fields = [
        ("Project / action name", ""),
        ("Funding programme (e.g. Horizon Europe, ESF+, LIFE)", ""),
        ("Call and topic reference", ""),
        ("Grant agreement number", ""),
        ("Lead partner (coordinator)", ""),
        ("Measurement partner (independent)", "Transitions Lab"),
        ("Reporting period, start (dd/mm/yyyy)", ""),
        ("Reporting period, end (dd/mm/yyyy)", ""),
        ("Demonstration or pilot sites", ""),
        ("Target population (who the project is for)", ""),
        ("Workbook version / last edited by", ""),
    ]
    row = write_table_rows(ws, row, identity_fields)
    note_row(ws, row, 2, (
        "Keep the measurement partner line as \"Transitions Lab\" where this workbook is "
        "operated independently; otherwise write who holds that function."
    ))


def build_a2_claims(wb: Workbook) -> None:
    ws = wb.create_sheet("A2. Impact claims")
    set_sheet_defaults(ws, [10, 54, 24, 20], first_row_height=36)

    row = write_title(ws, "A2 — Impact claims",
                      "State, in one sentence each, the change this project is actually promising. Complete at kick-off.", 4)

    row = write_rationale(ws, row, 4, "Why this sheet exists", (
        "Most European reports fail here before any data is collected. A claim written as "
        "\"raise awareness\" or \"strengthen capacity\" cannot be wrong, which also means "
        "it cannot be evidenced. Write each claim so a reasonable reader could disagree "
        "with it: the subject (what will change), the population (who it will change for) "
        "and the horizon (by when) all need to be in the sentence. Three claims is a "
        "working number; five is the ceiling. If you cannot narrow the project to five "
        "claims the project does not yet know what it is for."
    ))

    row = write_table_header(ws, row, ["ID", "We claim this project will…", "For whom (named group)", "By when (date / milestone)"])
    row = write_table_rows(ws, row, [
        ["C1", "", "", ""],
        ["C2", "", "", ""],
        ["C3", "", "", ""],
        ["C4", "", "", ""],
        ["C5", "", "", ""],
    ])
    note_row(ws, row, 4, (
        "A claim that cannot be wrong cannot be evidenced. \"Increase the share of "
        "participating households who switch supplier within six months\" is a claim; "
        "\"raise awareness\" is not."
    ))


def build_a3_pathway(wb: Workbook) -> None:
    ws = wb.create_sheet("A3. Impact pathway")
    set_sheet_defaults(ws, [10, 30, 30, 30, 30, 36], first_row_height=36)

    row = write_title(ws, "A3 — Impact pathway",
                      "For each claim, make the activity-to-impact logic explicit. Complete at kick-off.", 6)

    row = write_rationale(ws, row, 6, "Why this sheet exists", (
        "The point of writing a pathway is not neatness, it is to expose the assumption "
        "between each step. An activity produces an output; an output changes behaviour "
        "or capability (outcome); the outcome compounds into a lasting change (impact). "
        "The assumption column is where projects most often fail: it names the thing that "
        "must hold for the next step to follow. If the key assumption is \"participants "
        "will use the new skill at work\" and no one tracks whether they do, the "
        "measurement system has a hole in it that the end-of-project report will fall "
        "through. Writing the assumption down at kick-off is how a project knows what to "
        "measure at midline."
    ))

    row = write_table_header(ws, row,
        ["Claim", "Activity (what we do)", "Output (what it produces)", "Outcome (what changes)", "Impact (the lasting change)", "Key assumption that must hold"])
    row = write_table_rows(ws, row, [
        ["C1", "", "", "", "", ""],
        ["C2", "", "", "", "", ""],
        ["C3", "", "", "", "", ""],
        ["C4", "", "", "", "", ""],
        ["C5", "", "", "", "", ""],
    ])
    note_row(ws, row, 6, (
        "If the \"key assumption\" column is blank for a row, the pathway is not finished; "
        "the project is still speaking in generalities. Return to the row when you can "
        "name the thing that must be true for the next step to follow."
    ))


def build_a4_indicators(wb: Workbook) -> None:
    ws = wb.create_sheet("A4. Indicator set")
    set_sheet_defaults(ws, [10, 40, 16, 26, 22, 22], first_row_height=36)

    row = write_title(ws, "A4 — Indicator set",
                      "Choose a small number of indicators per claim. Each indicator is tagged with exactly one dimension.", 6)

    row = write_rationale(ws, row, 6, "Why this sheet exists", (
        "A measurement framework is the sum of its indicators. Pick too few and the "
        "project is unmeasurable; pick too many and nothing is measured well. The "
        "working number is three to seven indicators per claim across the three "
        "dimensions. Mix reach, depth and experience in deliberate proportions: a project "
        "that measures only reach measures only its own ambition; a project that measures "
        "only depth loses the people it is supposed to serve; a project that measures "
        "only experience cannot defend itself to a funder.\n\n"
        "The Dimension column is a dropdown and is used by the Rollup sheet. Each "
        "indicator must have a unit (what the number is in), a source (how it was "
        "obtained) and a baseline-to-target pair. If any of those is empty the indicator "
        "will not reach close-out as evidence."
    ))

    row = write_table_header(ws, row,
        ["ID", "Indicator (one sentence)", "Dimension", "Unit / source", "Baseline", "Target"])

    # Make Dimension a validated dropdown via data validation.
    from openpyxl.worksheet.datavalidation import DataValidation
    dv = DataValidation(type="list", formula1='"reach,depth,experience"', allow_blank=True)
    dv.error = "Pick one of reach, depth, experience."
    dv.errorTitle = "Dimension"
    ws.add_data_validation(dv)

    indicator_rows = []
    for n in range(1, 13):
        indicator_rows.append([f"I{n}", "", "", "", "", ""])
    first_data_row = row
    row = write_table_rows(ws, row, indicator_rows)
    dv.add(f"C{first_data_row}:C{row - 1}")

    note_row(ws, row, 6, (
        "The Dimension cell is a dropdown. The Rollup sheet uses this column to aggregate "
        "indicators automatically; do not change the three permitted values."
    ))


def build_a5_baseline(wb: Workbook) -> None:
    ws = wb.create_sheet("A5. Baseline")
    set_sheet_defaults(ws, [10, 20, 20, 32, 20, 24], first_row_height=36)

    row = write_title(ws, "A5 — Baseline capture",
                      "The single most important sheet in this document. Captured once, before activity begins.", 6)

    row = write_rationale(ws, row, 6, "Why this sheet exists", (
        "A baseline is a \"before\" captured by instrument, on a date, with a named "
        "person responsible for the reading. Without it, every number in the close-out "
        "is unanchored. Reconstruction after the fact is not a baseline; it is a story. "
        "This sheet exists to make it structurally difficult for the project to arrive "
        "at close-out without one.\n\n"
        "The method/sample column is as important as the number itself: a baseline "
        "captured on a different instrument than the endline is not comparable, and the "
        "comparison that most projects try to make at the end quietly collapses here. "
        "The checklist at the bottom is for the measurement lead to sign off before any "
        "activity begins."
    ))

    row = write_table_header(ws, row,
        ["Indicator ID", "Baseline value", "Date captured", "Method / sample", "Captured by", "Stored at (link / file)"])
    row = write_table_rows(ws, row, [[f"I{n}", "", "", "", "", ""] for n in range(1, 13)])

    row = section_break(ws, row, 6)
    ws.merge_cells(start_row=row, end_row=row, start_column=1, end_column=6)
    c = ws.cell(row=row, column=1, value="Measurement lead baseline sign-off")
    c.font = H2_FONT
    row += 1
    for text in [
        "□  Baseline captured BEFORE project activities began",
        "□  The same instrument will be used at endline, so the comparison is valid",
        "□  Baseline data stored and version-controlled (link above)",
        "□  Baseline sample size recorded and documented",
        "□  Any exclusions from the baseline are written down and justified",
    ]:
        ws.merge_cells(start_row=row, end_row=row, start_column=1, end_column=6)
        c = ws.cell(row=row, column=1, value=text)
        c.font = BODY_FONT
        row += 1


def build_b1_midline(wb: Workbook) -> None:
    ws = wb.create_sheet("B1. Midline readings")
    set_sheet_defaults(ws, [10, 18, 18, 18, 18, 24, 26], first_row_height=36)

    row = write_title(ws, "B1 — Midline readings",
                      "Short, repeatable readings taken while the project is live.", 7)

    row = write_rationale(ws, row, 7, "Why this sheet exists", (
        "Measurement that only appears at the end is a report. Measurement that appears "
        "during the project is a steering instrument. The midline sheet exists so the "
        "same indicators chosen at kick-off are read at two or three agreed points while "
        "there is still time to change what the project is doing. Two midpoints is the "
        "working number; a single midpoint is a reporting event, not a feedback loop.\n\n"
        "The direction column (↑ on track, → flat, ↓ off track) is a signal, not a "
        "verdict. A ↓ is not a failure; it is the first evidence that something upstream "
        "needs attention. The B2 steering log is where that attention is recorded."
    ))

    row = write_table_header(ws, row,
        ["Indicator ID", "Baseline", "Midline 1 value", "Midline 1 date", "Midline 2 value", "Midline 2 date", "Direction (↑ / → / ↓)"])
    row = write_table_rows(ws, row, [[f"I{n}", "", "", "", "", "", ""] for n in range(1, 13)])
    note_row(ws, row, 7, (
        "The direction column should be filled in by the measurement lead, not by a "
        "work-package owner reading their own numbers. Independence inside a consortium is "
        "the only reason this signal carries weight."
    ))


def build_b2_steering(wb: Workbook) -> None:
    ws = wb.create_sheet("B2. Steering log")
    set_sheet_defaults(ws, [36, 36, 36, 18], first_row_height=36)

    row = write_title(ws, "B2 — Early signals and course-correction log",
                      "What the midline is showing, what it means, and what was done about it.", 4)

    row = write_rationale(ws, row, 4, "Why this sheet exists", (
        "A midline reading that changes nothing was not worth collecting. The steering "
        "log is the project's living evidence that measurement is being used. It is also "
        "the single most useful artefact for a funder review: a project that can show a "
        "handful of entries here, each with a date, a decision and an owner, is a project "
        "that was actually being managed to its claims. A project with an empty log that "
        "nevertheless reports every indicator \"on track\" is telling you something "
        "about its measurement discipline.\n\n"
        "Keep entries short. A full sentence per cell is enough. The log is not a diary; "
        "it is a chain of custody between an observation and an action."
    ))

    row = write_table_header(ws, row,
        ["What the data is showing", "What it suggests", "Action taken (and by whom)", "Date"])
    row = write_table_rows(ws, row, [["", "", "", ""] for _ in range(10)])


def build_b3_lived_experience(wb: Workbook) -> None:
    ws = wb.create_sheet("B3. Lived-experience pulse")
    set_sheet_defaults(ws, [44, 18, 18, 18, 18], first_row_height=36)

    row = write_title(ws, "B3 — Lived-experience pulse",
                      "A small set of structured questions put to the people the project affects, repeated each cycle.", 5)

    row = write_rationale(ws, row, 5, "Why this sheet exists", (
        "Reach and depth sit outside the person; experience is what the person reports "
        "from inside the change. The pulse is a disciplined way of hearing them, "
        "structured enough to show a trajectory and short enough to actually be answered. "
        "The questions here are a working default; adapt the wording to the population, "
        "keep the number of questions down, and run them against the same sample at every "
        "point. A pulse that reaches a different set of people each time does not "
        "produce a time series.\n\n"
        "The last column should be read qualitatively, not scored. The point of the "
        "\"single thing you would fix first\" question is not to generate a number; it "
        "is to surface a signal the project cannot easily see from inside its own plan."
    ))

    row = write_table_header(ws, row,
        ["Question", "Baseline", "Midline 1", "Midline 2", "Endline"])
    pulse_rows = [
        ["Has the change the project promised actually happened for you? (yes / partly / no)", "", "", "", ""],
        ["How much has it changed things, from your side? (0 = nothing, 10 = transformed)", "", "", "", ""],
        ["What is the single thing you would fix first? (open)", "", "", "", ""],
        ["Would you recommend or continue? (0 = no, 10 = enthusiastically)", "", "", "", ""],
        ["Add project-specific question here", "", "", "", ""],
        ["Add project-specific question here", "", "", "", ""],
    ]
    row = write_table_rows(ws, row, pulse_rows)
    note_row(ws, row, 5, (
        "Run the pulse on a consented sample, same roster each cycle, same wording, same "
        "channel. Changing any of those between cycles breaks the time series without "
        "most readers noticing."
    ))


def build_c1_before_after(wb: Workbook) -> None:
    ws = wb.create_sheet("C1. Before and after")
    set_sheet_defaults(ws, [10, 16, 16, 18, 18, 24], first_row_height=36)

    row = write_title(ws, "C1 — Before and after result",
                      "The headline table. The same indicator, measured by the same instrument, at baseline and endline.", 6)

    row = write_rationale(ws, row, 6, "Why this sheet exists", (
        "This is the sheet a funder reads first. The discipline is to populate it only "
        "with indicators where the baseline and endline were measured by the same "
        "instrument, on the same sampling logic. Any indicator that was redesigned "
        "mid-project should be flagged in the \"notes\" cell rather than silently rebased, "
        "because an undocumented rebasing is the fastest way to lose a reviewer's trust.\n\n"
        "The \"target met?\" column takes a short verdict followed by a confidence note "
        "(high / medium / low) so the headline does not conceal a thin evidence base. "
        "Numbers that improve on a small, unrepresentative sample are not the same news "
        "as numbers that improve on a wide one."
    ))

    row = write_table_header(ws, row,
        ["Indicator ID", "Baseline", "Endline", "Change (abs)", "Change (%)", "Target met? (verdict + confidence)"])
    rows = []
    for n in range(1, 13):
        rows.append([f"I{n}", "", "", f"=IFERROR(C{row + n - 1}-B{row + n - 1},\"\")",
                                       f"=IFERROR((C{row + n - 1}-B{row + n - 1})/B{row + n - 1},\"\")", ""])
    row = write_table_rows(ws, row, rows)

    # Add percent format to the % column
    for r in range(row - 12, row):
        ws.cell(row=r, column=5).number_format = "0.0%"


def build_c2_reading(wb: Workbook) -> None:
    ws = wb.create_sheet("C2. Reading the result")
    set_sheet_defaults(ws, [10, 32, 38, 38], first_row_height=36)

    row = write_title(ws, "C2 — Reading the result",
                      "For each claim, a plain-language verdict including the parts that are inconvenient.", 4)

    row = write_rationale(ws, row, 4, "Why this sheet exists", (
        "The before-and-after table shows what happened to the numbers. This sheet shows "
        "what the project believes those numbers mean, in sentences a non-specialist "
        "reader can follow. Three verdict levels, supported, partly supported and not "
        "supported, keep the language consistent across claims and across projects.\n\n"
        "The \"what we cannot conclude\" column is not an admission of defeat; it is what "
        "makes the other columns credible. Every piece of evidence has a boundary, and "
        "stating it is the thing that distinguishes an evaluation from a press release. "
        "A reviewer who sees this column filled in honestly is more likely to accept the "
        "claims that are supported."
    ))

    row = write_table_header(ws, row,
        ["Claim", "Verdict (supported / partly / not supported)", "What the evidence actually shows", "What we cannot conclude"])
    row = write_table_rows(ws, row, [[f"C{n}", "", "", ""] for n in range(1, 6)])


def build_c3_attribution(wb: Workbook) -> None:
    ws = wb.create_sheet("C3. Attribution and honesty")
    set_sheet_defaults(ws, [60, 50], first_row_height=36)

    row = write_title(ws, "C3 — Attribution and honesty check",
                      "The four questions that distinguish an evaluation from a press release.", 2)

    row = write_rationale(ws, row, 2, "Why this sheet exists", (
        "The hardest question in any impact evaluation is attribution: did the change "
        "actually happen because of the project, or alongside it? The honest answer is "
        "almost always \"partly,\" and projects that will not say so are projects whose "
        "numbers quietly stop being believed. This sheet makes the attribution question "
        "unavoidable, and it asks three others that funders care about but seldom put in "
        "writing: what else was going on, who was left out, and what would be done "
        "differently next time."
    ))

    row = write_table_header(ws, row, ["Question", "Answer"])
    attribution_rows = [
        ["Did the change happen BECAUSE OF the project, or alongside it? (state the basis for the attribution claim)", ""],
        ["What else was going on in the same window that could also explain the result?", ""],
        ["Which groups were under-represented in the sample, and does that change the headline?", ""],
        ["What would be measured differently if the project started again tomorrow?", ""],
        ["Where did the evidence surprise the project team?", ""],
        ["Where is the result stronger than expected, and where is it weaker?", ""],
    ]
    row = write_table_rows(ws, row, attribution_rows)
    note_row(ws, row, 2, (
        "The willingness to answer these questions in writing is the difference between an "
        "evaluation and a press release. If a cell is blank at close-out, the project does "
        "not yet have an evaluation."
    ))


def build_d_design_assets(wb: Workbook) -> None:
    ws = wb.create_sheet("D. Design assets")
    set_sheet_defaults(ws, [10, 24, 46, 32], first_row_height=36)

    row = write_title(ws, "D — Reusable design assets",
                      "Set once at the start of the project and referred to for the whole run.", 4)

    row = write_rationale(ws, row, 4, "Why this sheet exists", (
        "If \"participant\" means a different thing on each site, every subsequent "
        "number in the workbook is incomparable. Shared, written definitions are what "
        "lets a multi-site project report a single headline without quietly rolling up "
        "incompatible figures. Sampling and consent sit here for the same reason: a "
        "sample defined once and reused is a time series; a sample redefined per cycle "
        "is a sequence of unrelated snapshots.\n\n"
        "If the project has only one site, keep this sheet anyway. The discipline that "
        "it imposes travels well to the next project."
    ))

    row = write_table_header(ws, row, ["Section", "Field", "Description / entry", "Owner"])
    design_rows = [
        ["D1. Definitions", "What counts as a \"participant\"", "", ""],
        ["D1. Definitions", "What counts as a \"user\"", "", ""],
        ["D1. Definitions", "What counts as a \"site\" or \"pilot\"", "", ""],
        ["D1. Definitions", "What counts as being \"reached\"", "", ""],
        ["D1. Definitions", "What counts as a \"meaningful change\" for the depth indicators", "", ""],
        ["D2. Sampling", "Target sample size per site", "", ""],
        ["D2. Sampling", "How respondents are selected (sampling rule in one sentence)", "", ""],
        ["D2. Sampling", "Known biases in the frame (be explicit)", "", ""],
        ["D2. Consent", "How informed consent is captured and stored", "", ""],
        ["D2. Consent", "Who can be contacted for follow-up (consented list link)", "", ""],
        ["D3. Cross-site", "How many sites run this template", "", ""],
        ["D3. Cross-site", "Which site is the reference for comparison", "", ""],
        ["D3. Cross-site", "How differences in site context are documented, not averaged away", "", ""],
    ]
    row = write_table_rows(ws, row, design_rows)


def build_e_roles(wb: Workbook) -> None:
    ws = wb.create_sheet("E. Roles and cadence")
    set_sheet_defaults(ws, [40, 24, 24], first_row_height=36)

    row = write_title(ws, "E — Roles and cadence",
                      "Who runs each step and how often it runs. A framework without named owners has no owners.", 3)

    row = write_rationale(ws, row, 3, "Why this sheet exists", (
        "The commonest reason a measurement system quietly stops is that nobody was named "
        "to run it. Each row below has an owner and a cadence; the project coordinator "
        "reviews the whole sheet at kick-off and again at every midpoint. The measurement "
        "partner column is independent of the intervention being measured, which is the "
        "reason the project's own numbers can later be reported as evidence rather than "
        "as self-assessment."
    ))

    row = write_table_header(ws, row, ["Activity", "Owner", "Cadence"])
    roles = [
        ["Baseline capture (sheet A5)", "Measurement partner", "Once, before any activity"],
        ["Midline readings (sheet B1)", "Measurement partner + site leads", "At each agreed midpoint"],
        ["Steering log review (sheet B2)", "Project coordinator", "At each cycle"],
        ["Lived-experience pulse (sheet B3)", "Measurement partner", "Baseline, midlines, endline, same sample"],
        ["Endline and final reading (sheet C1)", "Measurement partner (independent)", "Once, at close"],
        ["Verdict and attribution (sheets C2, C3)", "Measurement partner, co-signed by coordinator", "Once, at close"],
        ["Dissemination of findings", "Communication partner, briefed by measurement partner", "Rolling from first result onward"],
    ]
    row = write_table_rows(ws, row, roles)


def build_rollup(wb: Workbook) -> None:
    ws = wb.create_sheet("Rollup. Dimensions")
    set_sheet_defaults(ws, [20, 16, 16, 16, 16, 36], first_row_height=36)

    row = write_title(ws, "Rollup — Dimensions",
                      "Every indicator rolls up here, by dimension, so a project reports in Reach, Depth and Experience.", 6)

    row = write_rationale(ws, row, 6, "Why this sheet exists", (
        "An impact framework whose indicators do not aggregate into something a reader "
        "can hold in their head is a framework that will be ignored at report time. The "
        "Rollup sheet collects the indicators by dimension and shows an average "
        "percentage change for each. The numbers are not meant to be the headline on "
        "their own: they are a prompt for a reader to look at the Before-and-after sheet "
        "with a sense of where the balance of the evidence sits. A project with 85 per "
        "cent reach, 20 per cent depth and no experience evidence is not the same news "
        "as a project with 40 per cent across all three, even if the headline count is "
        "larger in the first case."
    ))

    row = write_table_header(ws, row, [
        "Dimension",
        "Indicators measured",
        "Average change (%)",
        "Indicators on target",
        "Weight (0-1)",
        "What the dimension is about",
    ])

    # Formulas reference 'A4. Indicator set' and 'C1. Before and after'
    # by sheet name. Indicator rows in A4 are rows 15..26; C1 rows 15..26.
    # (These are where write_table_rows placed them given the standard
    # header/rationale layout.)
    #
    # We compute:
    #   indicators measured: COUNTIFS A4 dimension = X AND C1 endline <> ""
    #   avg change %: AVERAGEIFS of C1 % column
    #   on target: count of rows where verdict starts with "supported"
    #
    # To stay robust to small structural shifts we build the formulas with
    # named references.
    a4_dim_range = "'A4. Indicator set'!$C$15:$C$26"
    c1_end_range = "'C1. Before and after'!$C$15:$C$26"
    c1_pct_range = "'C1. Before and after'!$E$15:$E$26"
    c1_verdict   = "'C1. Before and after'!$F$15:$F$26"

    weights = [0.35, 0.35, 0.30]
    descriptions = [
        "Who the project actually touched and who it did not. The population side of the claim.",
        "How materially the systems, livelihoods or behaviours in question moved. The substance side of the claim.",
        "What the change feels like to the people inside it. The lived-reality side of the claim.",
    ]
    dims = [("reach", "reach"), ("depth", "depth"), ("experience", "experience")]
    first_row = row
    for i, (dim_label, dim_filter) in enumerate(dims):
        r = row + i
        ws.cell(row=r, column=1, value=dim_label.title()).font = LABEL_FONT
        ws.cell(row=r, column=2, value=f'=COUNTIFS({a4_dim_range}, "{dim_filter}", {c1_end_range}, "<>")')
        ws.cell(row=r, column=3, value=f'=IFERROR(AVERAGEIFS({c1_pct_range}, {a4_dim_range}, "{dim_filter}", {c1_pct_range}, "<>"),"")')
        ws.cell(row=r, column=3).number_format = "0.0%"
        ws.cell(row=r, column=4, value=f'=COUNTIFS({a4_dim_range}, "{dim_filter}", {c1_verdict}, "supported*")')
        ws.cell(row=r, column=5, value=weights[i])
        ws.cell(row=r, column=6, value=descriptions[i]).alignment = ALIGN_WRAP
        # Row styling
        for col in range(1, 7):
            cell = ws.cell(row=r, column=col)
            cell.fill = DIM_FILLS[dim_filter]
            cell.border = BORDER_ALL
            cell.font = BODY_FONT if col != 1 else LABEL_FONT
        ws.row_dimensions[r].height = 42
    row = first_row + 3

    row = section_break(ws, row, 6)
    ws.merge_cells(start_row=row, end_row=row, start_column=1, end_column=6)
    c = ws.cell(row=row, column=1, value="Weighted summary")
    c.font = H2_FONT
    row += 1
    ws.merge_cells(start_row=row, end_row=row, start_column=1, end_column=2)
    ws.cell(row=row, column=1, value="Overall weighted change (%)").font = LABEL_FONT
    ws.cell(row=row, column=3, value=(
        f'=IFERROR(SUMPRODUCT(C{first_row}:C{first_row+2}, E{first_row}:E{first_row+2}) / SUM(E{first_row}:E{first_row+2}), "")'
    ))
    ws.cell(row=row, column=3).number_format = "0.0%"
    ws.cell(row=row, column=3).font = Font(name="Calibri", size=12, bold=True, color=COBALT)

    note_row(ws, row + 1, 6, (
        "Weights are editable. The defaults (35% reach, 35% depth, 30% experience) reflect "
        "a project where distributional reach and substantive change are equally important "
        "and lived experience is the independent check on both. Adjust them to the project, "
        "and record the reasoning on the Readiness sheet."
    ))


def build_readiness(wb: Workbook) -> None:
    ws = wb.create_sheet("Readiness. End-result")
    set_sheet_defaults(ws, [10, 50, 24, 24], first_row_height=36)

    row = write_title(ws, "Readiness — End-result Societal Readiness claim",
                      "A nine-level claim, grounded in the evidence this workbook has produced, that a funder review can hold.", 4)

    row = write_rationale(ws, row, 4, "Why this sheet exists", (
        "Technology Readiness Level (TRL) measures how far a technology has moved from "
        "idea to proven system. Societal Readiness Level (SRL) measures how far a "
        "societal solution has moved from a problem statement to \"proven in society.\" "
        "Horizon Europe asks for a TRL claim; a growing number of funders ask for an "
        "SRL claim alongside it; some of the Lab's own work treats the pair as the end "
        "result, because a solution that is technically ready in a society that has not "
        "accepted it is not, in any meaningful sense, ready.\n\n"
        "This sheet turns the evidence the workbook has produced into a defensible SRL "
        "claim. The levels are the Innovation Fund Denmark scale (2018, as applied by "
        "the Lab). The project team selects a level, writes the evidence from this "
        "workbook that supports it, and names the specific sheets the reviewer can go "
        "to. A level claimed without a pointer to the sheet is a level that will not "
        "survive review."
    ))

    row = write_table_header(ws, row, [
        "Level", "What the level means", "Evidence from this workbook", "Reviewer sees this on sheet"
    ])
    srl = [
        ("SRL 1", "Problem identified and the societal need described in plain language.", "", "A1, A2"),
        ("SRL 2", "Formulation of problem, proposed solution, and relevant stakeholders. Initial expert input.", "", "A2, A3"),
        ("SRL 3", "Initial testing of proposed solution together with the stakeholders it affects.", "", "A4, A5, B3"),
        ("SRL 4", "Problem validated through pilot testing in the relevant environment to substantiate proposed impact and societal readiness.", "", "A5, B1, B3"),
        ("SRL 5", "Proposed solution validated, now by relevant stakeholders in the relevant real-world area.", "", "B1, B2, B3"),
        ("SRL 6", "Solution demonstrated in the relevant environment and in co-operation with relevant stakeholders to gain initial feedback on potential impact.", "", "B1, B2, C1"),
        ("SRL 7", "Refinement of project and/or solution and, if needed, retesting in relevant environment with relevant stakeholders.", "", "B2, C1, C2"),
        ("SRL 8", "Proposed solution, as well as a plan for societal adaptation, complete and qualified.", "", "C1, C2, C3, D"),
        ("SRL 9", "Actual project solution proven in the relevant environment.", "", "C1, C2, C3, E"),
    ]
    for level, meaning, _, where in srl:
        ws.cell(row=row, column=1, value=level).font = LABEL_FONT
        ws.cell(row=row, column=2, value=meaning).font = BODY_FONT
        ws.cell(row=row, column=3, value="").font = INPUT_FONT
        ws.cell(row=row, column=4, value=where).font = BODY_FONT
        for col in range(1, 5):
            cell = ws.cell(row=row, column=col)
            cell.alignment = ALIGN_WRAP
            cell.border = BORDER_ALL
        ws.row_dimensions[row].height = 40
        row += 1

    row = section_break(ws, row, 4)
    ws.merge_cells(start_row=row, end_row=row, start_column=1, end_column=4)
    ws.cell(row=row, column=1, value="End-result claim").font = H2_FONT
    row += 1

    labels = [
        ("Project SRL claim at endline (1-9)", "e.g. 6"),
        ("Reach dimension status (strong / mixed / weak)", "see Rollup sheet"),
        ("Depth dimension status (strong / mixed / weak)", "see Rollup sheet"),
        ("Experience dimension status (strong / mixed / weak)", "see Rollup sheet"),
        ("Confidence in this claim (high / medium / low)", "state the basis in the next cell"),
        ("Basis for the confidence rating (one or two sentences)", ""),
        ("Known caveats and open questions", ""),
    ]
    for label, hint in labels:
        c1 = ws.cell(row=row, column=1, value=label)
        c1.font = LABEL_FONT
        c1.alignment = ALIGN_WRAP
        c1.border = BORDER_ALL
        ws.merge_cells(start_row=row, end_row=row, start_column=2, end_column=4)
        c2 = ws.cell(row=row, column=2, value="")
        c2.font = INPUT_FONT
        c2.alignment = ALIGN_WRAP
        c2.border = BORDER_ALL
        if hint:
            # tiny hint in column header for the row (via comment)
            from openpyxl.comments import Comment
            c2.comment = Comment(hint, "Transitions Lab")
        ws.row_dimensions[row].height = 32
        row += 1

    note_row(ws, row, 4, (
        "An SRL claim without a Reach / Depth / Experience readout is not a Lab-grade "
        "readiness claim. The two readings are reported together or not at all."
    ))


def build_example(wb: Workbook) -> None:
    ws = wb.create_sheet("Example (filled)")
    set_sheet_defaults(ws, [8, 36, 16, 20, 20, 20, 24], first_row_height=36)

    row = write_title(
        ws,
        "Example — satellite monitoring of a smallholder landscape",
        (
            "A worked, anonymised example that shows the workbook completed for a two-year, "
            "satellite-plus-ground monitoring project in Indonesia, delivered to an "
            "international funder."
        ),
        7,
    )

    row = write_rationale(ws, row, 7, "The project at a glance", (
        "A two-year monitoring programme for a smallholder landscape in Indonesia, "
        "co-funded by an international development organisation. The project combines "
        "satellite remote sensing (vegetation indices, land-cover change) with a ground "
        "network of farmer households reporting yields, inputs and incident data via a "
        "simple SMS channel. The funder asked for a measurement framework that would "
        "support three things in one report: the project's own key performance "
        "indicators, honest reporting on the use of funds, and a line-by-line bill of "
        "materials for the ground kit and the data infrastructure. This workbook was "
        "used to run the measurement end to end. The names and numbers below are "
        "representative of a project of this shape; they are not drawn from a specific "
        "live case."
    ))

    # A2-style claims
    row = write_table_header(ws, row,
        ["#", "Impact claim", "For whom", "By when", "Dimension emphasis", "", ""])
    examples = [
        ["C1", "Satellite-plus-ground monitoring reports monthly land-cover change, read by the farmer co-operative, at a cost per hectare that lets it continue after the grant ends.", "Farmer co-operative in landscape X", "Month 24", "reach + depth", "", ""],
        ["C2", "The ground network of farmer reporters captures incidents (flood, pest, fire) within 72 hours and routes them to the response desk.", "Reporter households and co-op response desk", "Month 18", "experience", "", ""],
        ["C3", "The bill of materials is open and the running cost is transparent, so the funder and the co-operative can see where every euro went.", "Funder, co-operative", "Each reporting period", "accountability (reach)", "", ""],
    ]
    row = write_table_rows(ws, row, examples, example=True)

    row = section_break(ws, row, 7)

    # Indicator set
    row = write_table_header(ws, row,
        ["ID", "Indicator", "Dimension", "Unit / source", "Baseline", "Target", "Endline (worked)"])
    ind_rows = [
        ["I1", "Hectares under monthly satellite monitoring with ground-truth verification",     "reach",       "ha / Sentinel-2 + ground",                   "0",           "12,000",       "11,420"],
        ["I2", "Share of monitored hectares with a reporting household within 10 km",             "reach",       "% / co-op register",                         "0%",          "80%",          "78%"],
        ["I3", "Incidents (flood, pest, fire) routed to response desk within 72 h",               "depth",       "count, % within 72h / incident log",          "n/a",         "80% within 72h", "71% within 72h"],
        ["I4", "Reduction in landscape-level cover loss over the grant period, year-on-year",    "depth",       "% / Hansen GFC + Lab mosaic",                 "4.1%/yr",     "below 3.0%/yr", "2.6%/yr"],
        ["I5", "Reporter household satisfaction with the SMS reporting workflow",                 "experience",  "0-10 / quarterly pulse",                      "6.1",         "7.5",          "7.2"],
        ["I6", "\"The single thing I would fix first\" — most common theme at endline",           "experience",  "qualitative / quarterly pulse",               "n/a",         "n/a",          "SMS cost in dry months"],
        ["I7", "Co-operative use of monitoring report in a management decision",                  "depth",       "count / co-op minutes",                       "0",           "6",            "5"],
        ["I8", "Cost per monitored hectare per year (grant period)",                              "reach",       "EUR / finance records",                       "n/a",         "<€1.20",       "€1.14"],
        ["I9", "Share of total project spend documented in open bill of materials",               "reach",       "% / BoM sheet",                               "0%",          "100%",         "100%"],
    ]
    first = row
    row = write_table_rows(ws, row, ind_rows, example=True)
    for r in range(first, row):
        dim = ws.cell(row=r, column=3).value
        if dim in DIM_FILLS:
            for c in range(1, 8):
                ws.cell(row=r, column=c).fill = DIM_FILLS[dim]

    row = section_break(ws, row, 7)
    row = write_rationale(ws, row, 7, "What the result reads like, in prose", (
        "Reach was strong but not complete: coverage reached 11,420 of 12,000 hectares "
        "and 78 per cent of them had a reporter household within ten kilometres, both "
        "just short of target but with a clear and documented reason, three villages "
        "declined to join the reporter network and were not pressured. Depth was mixed: "
        "landscape cover-loss moved from 4.1 per cent per year to 2.6 per cent, which "
        "clears the target, but incident routing landed at 71 per cent within 72 hours "
        "against an 80 per cent target, and the project said so. Experience ran "
        "slightly below target, 7.2 against 7.5 on the satisfaction scale, with the "
        "most common fix-first theme being the cost of SMS in dry months, which "
        "surfaced here and nowhere else and became a change to the next grant.\n\n"
        "The bill of materials and the finance records closed at €1.14 per monitored "
        "hectare per year against a target of under €1.20, with 100 per cent of spend "
        "in the open bill of materials. The funder review accepted the SRL claim at "
        "6 (demonstrated in the relevant environment with co-operation of relevant "
        "stakeholders) with the reach caveat written down."
    ))


# ─── Workbook assembly ─────────────────────────────────────────────────

def build_xlsx() -> None:
    wb = Workbook()
    build_readme(wb)
    build_a1_identity(wb)
    build_a2_claims(wb)
    build_a3_pathway(wb)
    build_a4_indicators(wb)
    build_a5_baseline(wb)
    build_b1_midline(wb)
    build_b2_steering(wb)
    build_b3_lived_experience(wb)
    build_c1_before_after(wb)
    build_c2_reading(wb)
    build_c3_attribution(wb)
    build_d_design_assets(wb)
    build_e_roles(wb)
    build_rollup(wb)
    build_readiness(wb)
    build_example(wb)

    # Workbook-wide properties
    wb.properties.title = "European Project Impact-Tracking Template"
    wb.properties.creator = "Transitions Lab"
    wb.properties.description = (
        "Independent before-and-after impact measurement for a European project, "
        "demonstration or socially innovative action. Open methodology."
    )
    wb.properties.subject = "Impact measurement for European projects"
    wb.properties.keywords = "impact, measurement, Horizon Europe, ESF+, SRL, reach, depth, experience"

    ASSETS.mkdir(exist_ok=True)
    wb.save(XLSX_PATH)
    print(f"[xlsx]  {XLSX_PATH.relative_to(ROOT)} ({XLSX_PATH.stat().st_size // 1024} KB)")


# ─── PDF builder ───────────────────────────────────────────────────────

def build_pdf() -> None:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.lib.colors import HexColor
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
    from reportlab.platypus import (
        BaseDocTemplate,
        Frame,
        PageTemplate,
        Paragraph,
        Spacer,
        PageBreak,
        Table,
        TableStyle,
        KeepTogether,
    )

    ink    = HexColor("#1A1A1A")
    paper  = HexColor("#F3EDE1")
    paper2 = HexColor("#FBF7EC")
    mute   = HexColor("#6B6457")
    butter = HexColor("#F3C98B")
    rule   = HexColor("#D9D1BE")

    styles = getSampleStyleSheet()
    base = styles["BodyText"]
    base.fontName = "Helvetica"
    base.fontSize = 10.5
    base.leading  = 15
    base.textColor = ink
    base.alignment = TA_LEFT

    stdfst = ParagraphStyle(
        "stdfst", parent=base, fontSize=11.5, leading=17, textColor=mute,
        spaceAfter=10, fontName="Helvetica-Oblique")
    h1 = ParagraphStyle(
        "h1", parent=base, fontName="Helvetica-Bold", fontSize=22, leading=26,
        textColor=ink, spaceAfter=10, spaceBefore=4)
    h2 = ParagraphStyle(
        "h2", parent=base, fontName="Helvetica-Bold", fontSize=14, leading=20,
        textColor=ink, spaceBefore=18, spaceAfter=8)
    h3 = ParagraphStyle(
        "h3", parent=base, fontName="Helvetica-Bold", fontSize=11.5, leading=15,
        textColor=ink, spaceBefore=10, spaceAfter=4)
    body = ParagraphStyle(
        "body", parent=base, spaceAfter=8, alignment=TA_JUSTIFY)
    kick = ParagraphStyle(
        "kick", parent=base, fontName="Helvetica-Bold", fontSize=9, leading=11,
        textColor=mute, spaceAfter=2, textTransform="uppercase")
    footer_style = ParagraphStyle(
        "footer", parent=base, fontSize=8.5, textColor=mute, alignment=TA_CENTER)

    PAGE_W, PAGE_H = A4

    def on_page(canvas, doc):
        canvas.saveState()
        # background paper
        canvas.setFillColor(paper)
        canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
        # cream content card
        margin = 15 * mm
        canvas.setFillColor(paper2)
        canvas.rect(margin, margin, PAGE_W - 2 * margin, PAGE_H - 2 * margin, stroke=0, fill=1)
        # footer
        canvas.setFillColor(mute)
        canvas.setFont("Helvetica", 8)
        canvas.drawString(margin + 2 * mm, 8 * mm,
                          "Transitions Lab · European Project Impact-Tracking Template · transitionslab.org")
        canvas.drawRightString(PAGE_W - margin - 2 * mm, 8 * mm, f"{doc.page}")
        canvas.restoreState()

    frame = Frame(
        22 * mm, 22 * mm, PAGE_W - 44 * mm, PAGE_H - 44 * mm,
        leftPadding=4, rightPadding=4, topPadding=4, bottomPadding=4,
        showBoundary=0,
    )
    doc = BaseDocTemplate(
        str(PDF_PATH), pagesize=A4,
        leftMargin=22 * mm, rightMargin=22 * mm,
        topMargin=22 * mm, bottomMargin=22 * mm,
        title="European Project Impact-Tracking Template",
        author="Transitions Lab",
    )
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=on_page)])

    story = []
    story.append(Paragraph("Transitions Lab · Open methodology", kick))
    story.append(Paragraph("European Project Impact-Tracking Template", h1))
    story.append(Paragraph(
        "Independent before-and-after impact measurement for a European project, "
        "demonstration or socially innovative action, set up at the start, run while "
        "the work is live, closed out with proof.", stdfst))

    story.append(Spacer(1, 4))

    def section(title, paragraphs):
        story.append(Paragraph(title, h2))
        for p in paragraphs:
            story.append(Paragraph(p, body))

    section("The gap this template fills", [
        "Europe funds innovation at a scale unmatched anywhere in the world, across "
        "Horizon Europe, the European Social Fund Plus, the LIFE programme, the Just "
        "Transition Fund, the European Innovation Council, Interreg, Digital Europe, "
        "the EIT Knowledge and Innovation Communities and the New European Bauhaus. "
        "The funding is excellent. The evidence of what it actually changed, for "
        "whom, too often is not.",
        "The difficulty is structural, and it shows up the same way across programmes. "
        "The baseline is missing. Methods are inconsistent and incomparable. Output is "
        "mistaken for impact. The people most affected are rarely heard systematically. "
        "Self-assessment strains credibility. Evidence arrives too late to use.",
        "This template is the measurement architecture, in one document, that stops "
        "each of those failures from happening in a specific project.",
    ])

    section("Set it up at the start, run it throughout, close it with proof", [
        "<b>Before, baseline by design.</b> At kick-off the project agrees what it is "
        "actually claiming, identifies who should change and how, and captures a real "
        "baseline against which everything that follows will be measured. The \"before\" "
        "exists because someone went and recorded it, not because someone remembers it.",
        "<b>During, measurement while it matters.</b> Structured, repeatable readings "
        "run through the live phase of the project. Midline findings and lived-experience "
        "data are returned to the project team while there is still time to act on them. "
        "A midline reading that changes nothing was not worth collecting.",
        "<b>After, a result that holds up.</b> At close the project delivers the endline "
        "measurement and the before-and-after comparison, including the parts that are "
        "inconvenient. The output is designed to satisfy a funder review, survive audit, "
        "and tell the project team something true.",
    ])

    section("The three dimensions the template measures to", [
        "<b>Reach</b> is who is being affected by the project, and who is being left "
        "out. Headcount alone is not reach; reach needs to be able to answer who the "
        "headcount is.",
        "<b>Depth</b> is how materially the systems, livelihoods or behaviours in "
        "question actually change. A workshop attended is not depth; a decision taken "
        "differently afterwards is.",
        "<b>Experience</b> is what the change feels like, from the inside, to the "
        "people going through it. It is where friction lives, and where the project "
        "learns the thing it would not otherwise know.",
        "Every indicator in the companion workbook is tagged with exactly one of these "
        "three dimensions. The rollup aggregates by dimension; the end-result claim "
        "(a Societal Readiness Level number from 1 to 9) is built on the balance "
        "between them.",
    ])

    # Table of sheets
    data = [
        ["Sheet", "What it is for", "When to fill it"],
        ["A1. Project identity", "Metadata the rest of the workbook refers to.", "Kick-off"],
        ["A2. Impact claims", "The project's promises, written so a reader could disagree.", "Kick-off"],
        ["A3. Impact pathway", "Activity → Output → Outcome → Impact, with the assumption named.", "Kick-off"],
        ["A4. Indicator set", "Three to seven indicators per claim, tagged by dimension.", "Kick-off"],
        ["A5. Baseline", "The single most important sheet. Captured before activity.", "Kick-off"],
        ["B1. Midline readings", "The same indicators, read at agreed midpoints.", "Each midline"],
        ["B2. Steering log", "What the midline is showing, and what was done about it.", "Each midline"],
        ["B3. Lived-experience pulse", "A short, repeated survey of the people affected.", "Baseline → endline"],
        ["C1. Before and after", "The headline table. Same instrument at baseline and endline.", "Close-out"],
        ["C2. Reading the result", "Verdict for each claim, including what is inconvenient.", "Close-out"],
        ["C3. Attribution and honesty", "Four questions that make an evaluation an evaluation.", "Close-out"],
        ["D. Design assets", "Definitions, sampling, consent. Set once, reused throughout.", "Kick-off"],
        ["E. Roles and cadence", "Who runs each step and how often it runs.", "Kick-off"],
        ["Rollup. Dimensions", "Aggregates indicators to reach, depth, experience.", "Automatic"],
        ["Readiness. End-result", "An SRL 1-9 claim grounded in this workbook's evidence.", "Close-out"],
        ["Example (filled)", "A worked example from a satellite-monitoring project.", "Reference"],
    ]
    tbl = Table(data, colWidths=[42 * mm, 92 * mm, 32 * mm], repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), ink),
        ("TEXTCOLOR",  (0, 0), (-1, 0), paper),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, -1), 9),
        ("LEADING",    (0, 0), (-1, -1), 12),
        ("VALIGN",     (0, 0), (-1, -1), "TOP"),
        ("BOX",        (0, 0), (-1, -1), 0.5, rule),
        ("INNERGRID",  (0, 0), (-1, -1), 0.25, rule),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 5),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 5),
    ]))
    story.append(Paragraph("What is in the companion workbook", h2))
    story.append(Paragraph(
        "Each sheet below carries its own long-form rationale at the top, then the "
        "instrument. The workbook rolls indicators up to the three dimensions and to a "
        "final Societal Readiness Level claim.", body))
    story.append(tbl)
    story.append(Spacer(1, 8))

    section("End-result: Reach / Depth / Experience, and a Societal Readiness Level", [
        "A project's end-result report has three readouts, not one. The Reach column "
        "says who the project touched. The Depth column says how much it moved what it "
        "touched. The Experience column says what that movement felt like from inside. "
        "The three sit next to each other on the Rollup sheet of the workbook.",
        "The Readiness sheet then turns the three readouts into a single SRL claim on "
        "the nine-level scale developed by Innovation Fund Denmark and extended by the "
        "research literature on societal readiness. The claim is grounded, sheet by "
        "sheet, in the specific evidence this template has produced. A level claimed "
        "without a pointer to a sheet does not survive review.",
    ])

    section("Independence is the whole point", [
        "The reason to use this template with the Lab is the reason a project cannot "
        "do this convincingly itself. The Lab is independent of the intervention it is "
        "measuring. It is social and technical at once: it starts from the people a "
        "project affects, and it also understands the system being demonstrated. It "
        "reports what the data says, including when it is inconvenient.",
        "A result the Lab reports means something a self-assessment cannot.",
    ])

    # Compact method credit
    story.append(Spacer(1, 10))
    cite = ParagraphStyle("cite", parent=base, fontSize=9, leading=12, textColor=mute,
                          alignment=TA_CENTER)
    story.append(Paragraph(
        "Cite as: Transitions Lab (2026), <i>European Project Impact-Tracking Template</i>, "
        "transitionslab.org/european-impact-tracking.", cite))

    doc.build(story)
    print(f"[pdf]   {PDF_PATH.relative_to(ROOT)} ({PDF_PATH.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    build_xlsx()
    build_pdf()
