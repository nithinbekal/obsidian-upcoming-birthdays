# Obsidian Upcoming Birthdays

A plugin for Obsidian that tracks and displays upcoming birthdays from your notes.

## Features

- 📅 Automatically finds notes with a `date-of-birth` property in their frontmatter
- 🎂 Shows upcoming birthdays with age calculation
- 🎉 Highlights birthdays happening today or soon
- ⚙️ Customizable settings for property name and look-ahead period
- 📍 Click on names to open the corresponding note

## Usage

### Adding Birthdays to Your Notes

Add a `date-of-birth` property to the frontmatter of any note:

```markdown
---
date-of-birth: 1990-05-15
---

# John Doe

Contact information and other details...
```

### Viewing Birthdays

1. Click the cake icon 🎂 in the left ribbon, or
2. Use the command palette (Ctrl/Cmd + P) and search for "Open Birthday View"

The birthday view will appear in the right sidebar showing:
- Birthdays happening today (highlighted)
- Upcoming birthdays within your configured range
- How many days until each birthday
- The age the person will turn

## Settings

- **Date of Birth Property**: The frontmatter property name to look for (default: `date-of-birth`)
- **Days to Look Ahead**: How many days in advance to show birthdays (default: 30)

## Installation

### For Development

1. Clone this repository into your vault's `.obsidian/plugins/` folder:
   ```bash
   cd /path/to/vault/.obsidian/plugins
   git clone https://github.com/yourusername/obsidian-birthday-plugin.git
   ```

2. Install dependencies:
   ```bash
   cd obsidian-birthday-plugin
   npm install
   ```

3. Build the plugin:
   ```bash
   npm run build
   ```

4. Reload Obsidian and enable the plugin in Settings → Community Plugins

### For Development with Auto-Reload

Run in development mode with auto-rebuild:
```bash
npm run dev
```

## Date Formats

The plugin accepts any standard date format that JavaScript can parse:
- `1990-05-15` (ISO format, recommended)
- `1990/05/15`
- `May 15, 1990`
- `15 May 1990`

## License

MIT
