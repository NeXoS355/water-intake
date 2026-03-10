# Mein Tages-Wasserlogbuch

I got annoyed by all the ads in smartphone apps for tracking water intake – so I built my own and learned some web programming along the way.

A simple Progressive Web App (PWA) for tracking your daily water consumption. No database, no account, no ads. Everything is stored locally in your browser.

## Features

- Log water intake in preset amounts (200 ml – 500 ml)
- One configurable custom amount button with a touch-friendly slider
- Set a custom daily goal
- Water glass visualization with fill animation and per-entry time markers
- Monthly calendar view with color-coded days (goal reached / partial / none)
- Tap any past day in the calendar to see a detailed breakdown of all entries
- Swipe left on an entry in the day detail view to delete it
- Streak counter for consecutive days reaching the goal
- Log entries for past dates and times via a collapsible date/time picker
- Dark/Light theme toggle
- Haptic feedback on water buttons (Android)
- Works offline as a PWA (installable on mobile/desktop)
- All data stored locally in browser storage – no server, no account needed
- Data backup & restore via the Web Share API (share as a `.json` file to Notes, Mail, Drive etc.)

## URL Parameters

The app supports external triggers via URL parameters:

| Parameter | Example | Description |
|---|---|---|
| `menge` | `?menge=300` | Add a water entry (50–2000 ml) |
| `setGoal` | `?setGoal=2500` | Set daily goal (500–10000 ml) |
| `reset` | `?reset=1` | Clear all data (with confirmation) |

This makes it easy to log water intake without even opening the app. On iPhone, you can create a **Shortcut** via the Shortcuts app that opens a URL like `https://your-domain.com?menge=300`. Add it to your home screen and one tap silently logs 300 ml in the background. You can create multiple shortcuts for different amounts (e.g. 200 ml for a small glass, 500 ml for a bottle).
