# SR.DEV — Minecraft Plugin Workshop Website

A complete front-end website for a Minecraft plugin/resource shop: browse free
plugins, maps, configs & Skripts, submit paid custom plugin orders, post &
vote on suggestions, and manage everything from an owner dashboard.

## Files
```
index.html      → all pages (Home, Resources, Order, Suggestions, Login/Register, Owner Dashboard)
css/style.css    → the full voxel/Minecraft-inspired design system
js/app.js        → routing, auth, and all data logic
```

## How to run it
Just open `index.html` in a browser — no build step, no server needed.
To host it for real, upload these 3 files/folders to any static host
(GitHub Pages, Netlify, Vercel, or your Replit project) keeping the same
folder structure.

## Owner login
Go to **Log In** and use:
- Email: `jackrick10@gmail.com`
- Password: `sovele@3`

This logs you into the **Dashboard** tab where you can:
- Add / delete free resources (plugins, maps, configs, skripts, other)
- Review paid orders and change their status (pending → accepted → in‑progress → delivered)
- Manage suggestion statuses (open → planned → done) or delete them
- See registered users

## ⚠️ Important: this is a front-end-only demo
Everything (accounts, orders, suggestions, resources) is stored in the
visitor's own browser using `localStorage`. That means:

1. **No real accounts across devices.** If a player registers on their phone,
   that account won't exist on their laptop. Real multi-device accounts need
   a real backend + database (e.g. Node/Express + MongoDB, Firebase, or
   Supabase).
2. **The owner password is visible in the page source.** Anyone who opens
   dev tools and views `js/app.js` can read `sovele@3` directly. This is
   fine for trying the site out, but **do not use this as-is once real
   players will visit the site.** Before going live you should:
   - Move the owner check to a real backend (never ship a password in
     client-side JavaScript), and
   - Store passwords hashed (e.g. bcrypt) instead of in plain text.
3. **No real payments are processed.** The order form collects requirements
   and a budget; it does not charge anyone. You arrange payment manually
   with each buyer after reviewing their order (Discord, PayPal, etc. —
   whatever you prefer), exactly like the "How commissions work" panel on
   the Orders page describes.

## Wanting a real backend later
The whole app funnels every read/write through one place in `js/app.js`
(the `DB` object + `saveDB()`/`loadDB()`). When you're ready for a real
backend, swap those functions for `fetch()` calls to your API — the rest of
the app (routing, rendering, forms) doesn't need to change.

## Customizing
- **Colors / fonts**: edit the `:root` variables at the top of `css/style.css`.
- **Starter resources**: edit the `seedResources()` function in `js/app.js`
  (only used the very first time someone visits, before they have any saved data).
- **Site name / copy**: search `index.html` for "SR.DEV" and the hero text.
