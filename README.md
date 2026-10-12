# Waypoint public client distribution

This repository contains the public dashboard, installable Chrome/MCP companions and their documentation. The private account backend, billing implementation, tests, database and full repository archive are excluded.

Render Static Site: build `python3 deploy.py`, publish `site`, automatic deployment off. Render supplies the actual HTTPS origin and the build pins the Chrome companion to it. Install the companion from the deployed website. No paid compute, persistent disk or custom domain is required for this client deployment. Hosting usage remains subject to included bandwidth/build allowances.
