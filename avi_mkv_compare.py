#!/usr/bin/env python3
"""
Scan a directory for .avi/.mkv files sharing the same filename prefix
and browse them in an ncurses TUI with sizes and compression ratio.

Usage:
    avi_mkv_compare.py [directory] [-r]

    directory   Directory to scan (default: current directory)
    -r/--recursive  Recurse into subdirectories
"""
import curses
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass


@dataclass
class Pair:
    prefix: str
    dirpath: str
    avi_path: str | None
    mkv_path: str | None
    avi_size: int
    mkv_size: int

    @property
    def ratio(self) -> float | None:
        """Ratio of the larger file to the smaller file, if both exist."""
        if self.avi_size and self.mkv_size:
            return max(self.avi_size, self.mkv_size) / min(self.avi_size, self.mkv_size)
        return None


def human_size(n: int) -> str:
    if n <= 0:
        return "-"
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024:
            return f"{n:.1f}{unit}" if unit != "B" else f"{n}B"
        n /= 1024
    return f"{n:.1f}PB"


def find_pairs(root: str, recursive: bool, report_progress: bool = False) -> list[Pair]:
    by_dir_prefix: dict[tuple[str, str], dict[str, str]] = {}

    if recursive:
        walker = os.walk(root)
    else:
        walker = [(root, [], os.listdir(root))]

    dirs_scanned = 0
    matches_found = 0
    for dirpath, _dirs, files in walker:
        dirs_scanned += 1
        for fname in files:
            lower = fname.lower()
            if lower.endswith(".avi"):
                ext = "avi"
            elif lower.endswith(".mkv"):
                ext = "mkv"
            else:
                continue
            matches_found += 1
            prefix = fname[: -(len(ext) + 1)]
            key = (dirpath, prefix)
            by_dir_prefix.setdefault(key, {})[ext] = os.path.join(dirpath, fname)

        if report_progress:
            msg = f"\rScanning... {dirs_scanned} dirs, {matches_found} .avi/.mkv files found | {dirpath}"
            sys.stderr.write(msg[:shutil.get_terminal_size((80, 20)).columns])
            sys.stderr.write("\033[K")
            sys.stderr.flush()

    if report_progress:
        sys.stderr.write("\r\033[K")
        sys.stderr.flush()

    pairs = []
    for (dirpath, prefix), exts in by_dir_prefix.items():
        if "avi" in exts and "mkv" in exts:
            avi_path = exts["avi"]
            mkv_path = exts["mkv"]
            pairs.append(
                Pair(
                    prefix=prefix,
                    dirpath=dirpath,
                    avi_path=avi_path,
                    mkv_path=mkv_path,
                    avi_size=os.path.getsize(avi_path),
                    mkv_size=os.path.getsize(mkv_path),
                )
            )

    pairs.sort(key=lambda p: (p.ratio or 0), reverse=True)
    return pairs


def run_tui(stdscr, pairs: list[Pair]):
    curses.curs_set(0)
    curses.start_color()
    curses.use_default_colors()
    curses.init_pair(1, curses.COLOR_CYAN, -1)   # header
    curses.init_pair(2, curses.COLOR_BLACK, curses.COLOR_CYAN)  # selection
    curses.init_pair(3, curses.COLOR_YELLOW, -1)  # ratio highlight

    top = 0
    selected = 0
    marked: set[tuple[str, str]] = set()

    def pair_key(p: Pair) -> tuple[str, str]:
        return (p.dirpath, p.prefix)

    while True:
        stdscr.erase()
        h, w = stdscr.getmaxyx()

        title = f" avi/mkv compression browser ({len(pairs)} pairs, {len(marked)} marked) "
        stdscr.addnstr(0, 0, title.center(w), w, curses.A_BOLD | curses.color_pair(1))

        header = f"{'':3} {'Name':<50.50} {'AVI':>10} {'MKV':>10} {'Ratio':>8} {'Smaller':>8}"
        stdscr.addnstr(1, 0, header.ljust(w), w, curses.A_UNDERLINE)

        list_h = h - 4
        if selected < top:
            top = selected
        if selected >= top + list_h:
            top = selected - list_h + 1

        for i in range(list_h):
            idx = top + i
            if idx >= len(pairs):
                break
            p = pairs[idx]
            ratio_str = f"{p.ratio:.2f}x" if p.ratio else "-"
            smaller = "mkv" if p.mkv_size < p.avi_size else "avi" if p.avi_size < p.mkv_size else "="
            mark_col = "[x]" if pair_key(p) in marked else "[ ]"
            line = (
                f"{mark_col} {p.prefix:<50.50} {human_size(p.avi_size):>10} "
                f"{human_size(p.mkv_size):>10} {ratio_str:>8} {smaller:>8}"
            )
            attr = curses.A_NORMAL
            if idx == selected:
                attr = curses.color_pair(2)
            if pair_key(p) in marked:
                attr |= curses.color_pair(3)
            stdscr.addnstr(2 + i, 0, line.ljust(w), w, attr)

        detail_row = h - 2
        if pairs:
            p = pairs[selected]
            stdscr.addnstr(detail_row, 0, f"AVI: {p.avi_path}"[: w - 1], w - 1)
            if detail_row + 1 < h:
                stdscr.addnstr(detail_row + 1, 0, f"MKV: {p.mkv_path}"[: w - 1], w - 1)

        footer = " up/down or j/k: move   space: mark avi   enter: delete marked   o: open dir   q: quit "
        stdscr.addnstr(h - 1, 0, footer.ljust(w - 1), w - 1, curses.A_REVERSE)

        stdscr.refresh()

        key = stdscr.getch()
        if key in (ord("q"), 27):
            break
        elif key in (curses.KEY_UP, ord("k")):
            selected = max(0, selected - 1)
        elif key in (curses.KEY_DOWN, ord("j")):
            selected = min(len(pairs) - 1, selected + 1)
        elif key == curses.KEY_NPAGE:
            selected = min(len(pairs) - 1, selected + list_h)
        elif key == curses.KEY_PPAGE:
            selected = max(0, selected - list_h)
        elif key == curses.KEY_HOME:
            selected = 0
        elif key == curses.KEY_END:
            selected = len(pairs) - 1
        elif key == ord(" ") and pairs:
            k = pair_key(pairs[selected])
            if k in marked:
                marked.discard(k)
            else:
                marked.add(k)
        elif key in (ord("o"), ord("O")) and pairs:
            subprocess.Popen(["open", pairs[selected].dirpath])
        elif key in (curses.KEY_ENTER, 10, 13) and marked:
            for p in pairs:
                k = pair_key(p)
                if k in marked and p.avi_path and os.path.exists(p.avi_path):
                    os.remove(p.avi_path)
            pairs[:] = [p for p in pairs if pair_key(p) not in marked]
            marked.clear()
            selected = min(selected, max(0, len(pairs) - 1))


def main():
    args = sys.argv[1:]
    recursive = False
    directory = "."

    for arg in args:
        if arg in ("-r", "--recursive"):
            recursive = True
        else:
            directory = arg

    directory = os.path.abspath(directory)
    if not os.path.isdir(directory):
        print(f"Not a directory: {directory}", file=sys.stderr)
        sys.exit(1)

    pairs = find_pairs(directory, recursive, report_progress=recursive)
    if not pairs:
        print(f"No matching .avi/.mkv pairs found in {directory}")
        sys.exit(0)

    curses.wrapper(run_tui, pairs)


if __name__ == "__main__":
    main()
