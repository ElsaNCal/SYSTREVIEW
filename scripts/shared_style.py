"""
shared_style.py — Publication-quality figure defaults for Computational Reviews.

Usage:
    from shared_style import apply_style, COLORS, PALETTES, save_figure
    apply_style()  # Call once at start
    
    fig, ax = plt.subplots(figsize=FIGSIZE['full'])
    # ... your plot code ...
    save_figure(fig, 'fig_name.png')
"""

import matplotlib.pyplot as plt
import matplotlib as mpl
import numpy as np


# ═══════════════════════════════════════════════════════════
# COLOR PALETTES
# ═══════════════════════════════════════════════════════════

COLORS = {
    # Primary palette — high-contrast, colorblind-friendly
    'blue':        '#2563EB',  # vivid blue
    'green':       '#059669',  # emerald
    'red':         '#DC2626',  # clear red
    'amber':       '#D97706',  # warm amber
    'purple':      '#7C3AED',  # violet
    'teal':        '#0891B2',  # cyan-teal
    'pink':        '#DB2777',  # magenta-pink
    'indigo':      '#4F46E5',  # deep indigo
    
    # Neutral tones
    'gray_900':    '#111827',  # near-black text
    'gray_700':    '#374151',  # secondary text
    'gray_500':    '#6B7280',  # tertiary text
    'gray_300':    '#D1D5DB',  # borders, gridlines
    'gray_100':    '#F3F4F6',  # subtle backgrounds
    'white':       '#FFFFFF',
    
    # Semantic colors
    'positive':    '#059669',  # confirmed, replicated
    'negative':    '#DC2626',  # contested, failed
    'neutral':     '#6B7280',  # unknown, pending
    'highlight':   '#2563EB',  # emphasis
    
    # Agent colors (for pipeline figures)
    'coordinator': '#475569',  # slate
    'expert':      '#059669',  # emerald
    'dataml':      '#2563EB',  # blue
    'barrier':     '#DC2626',  # red
    'gate':        '#D97706',  # amber
}

# Ordered palettes for categorical data
PALETTES = {
    'categorical_6': ['#2563EB', '#059669', '#DC2626', '#D97706', '#7C3AED', '#0891B2'],
    'categorical_8': ['#2563EB', '#059669', '#DC2626', '#D97706', '#7C3AED', '#0891B2', '#DB2777', '#4F46E5'],
    'sequential_blue': ['#DBEAFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF'],
    'sequential_green': ['#D1FAE5', '#6EE7B7', '#34D399', '#10B981', '#059669', '#047857', '#065F46'],
    'diverging': ['#DC2626', '#F87171', '#FCA5A5', '#F3F4F6', '#93C5FD', '#3B82F6', '#2563EB'],
    'evidence_quality': ['#059669', '#D97706', '#6B7280'],  # replicated, single study, unknown
}


# ═══════════════════════════════════════════════════════════
# FIGURE SIZES (inches)
# ═══════════════════════════════════════════════════════════

FIGSIZE = {
    'full':      (14, 8),    # Full width, landscape
    'wide':      (14, 6),    # Full width, shorter
    'half':      (7, 5.5),   # Half width
    'square':    (8, 8),     # Square
    'tall':      (10, 12),   # Portrait
}


# ═══════════════════════════════════════════════════════════
# STYLE APPLICATION
# ═══════════════════════════════════════════════════════════

def apply_style():
    """Apply publication-quality matplotlib defaults. Call once at start."""
    
    plt.rcParams.update({
        # ─── Typography ───
        'font.family':         'sans-serif',
        'font.sans-serif':     ['Helvetica', 'Arial', 'DejaVu Sans'],
        'font.size':           13,         # Base font — readable at full width
        'axes.labelsize':      14,         # Axis labels
        'axes.titlesize':      16,         # Subplot titles
        'xtick.labelsize':     12,         # Tick labels
        'ytick.labelsize':     12,
        'legend.fontsize':     12,
        'legend.title_fontsize': 13,
        'figure.titlesize':    18,         # Suptitle
        
        # ─── Axis styling ───
        'axes.spines.top':     False,      # Remove top spine
        'axes.spines.right':   False,      # Remove right spine
        'axes.linewidth':      0.8,        # Thin axis lines
        'axes.edgecolor':      '#374151',  # Dark gray axis
        'axes.labelcolor':     '#111827',  # Near-black labels
        'axes.labelpad':       8,          # Space between label and axis
        
        # ─── Grid ───
        'axes.grid':           False,      # Grid off by default (add intentionally)
        'grid.color':          '#E5E7EB',
        'grid.linewidth':      0.5,
        'grid.linestyle':      '--',
        
        # ─── Ticks ───
        'xtick.major.size':    5,
        'ytick.major.size':    5,
        'xtick.major.width':   0.8,
        'ytick.major.width':   0.8,
        'xtick.color':         '#374151',
        'ytick.color':         '#374151',
        'xtick.direction':     'out',
        'ytick.direction':     'out',
        'xtick.major.pad':     5,
        'ytick.major.pad':     5,
        
        # ─── Legend ───
        'legend.frameon':      True,
        'legend.framealpha':   0.95,
        'legend.edgecolor':    '#D1D5DB',
        'legend.fancybox':     True,
        'legend.borderpad':    0.6,
        'legend.labelspacing': 0.5,
        
        # ─── Figure ───
        'figure.facecolor':    'white',
        'axes.facecolor':      'white',
        'savefig.facecolor':   'white',
        'savefig.dpi':         300,
        'savefig.bbox':        'tight',
        'savefig.pad_inches':  0.3,
        
        # ─── Lines and patches ───
        'lines.linewidth':     1.5,
        'patch.linewidth':     0.8,
    })


def save_figure(fig, filename, dpi=300):
    """Save figure with consistent settings."""
    fig.savefig(filename, dpi=dpi, bbox_inches='tight', 
                facecolor='white', pad_inches=0.3)
    plt.close(fig)


# ═══════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════

def add_panel_label(ax, label, x=-0.08, y=1.05, fontsize=18):
    """Add a panel label (a, b, c) to a subplot."""
    ax.text(x, y, label, transform=ax.transAxes, fontsize=fontsize,
            fontweight='bold', va='top', ha='right', color=COLORS['gray_900'])


def lighten_color(hex_color, factor=0.3):
    """Return a lighter version of a hex color for backgrounds."""
    r, g, b = int(hex_color[1:3], 16), int(hex_color[3:5], 16), int(hex_color[5:7], 16)
    r = int(r + (255 - r) * factor)
    g = int(g + (255 - g) * factor)
    b = int(b + (255 - b) * factor)
    return f'#{r:02x}{g:02x}{b:02x}'


def add_source_note(ax, text, y=-0.12):
    """Add a small source/caveat note below the plot."""
    ax.text(0.5, y, text, transform=ax.transAxes, fontsize=10,
            color=COLORS['gray_500'], ha='center', va='top', fontstyle='italic')
