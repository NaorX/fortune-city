# Fortune City

A 3D browser game developed by [NaorX](https://github.com/NaorX), inspired by the studio atmosphere and city bonus rounds of **MONOPOLY Live**. Built for fun, with an animated host, a spinning wheel and a city board to explore with every bonus roll.

<!-- Add a gameplay video and screenshots here. Use GitHub-uploaded media or relative paths to files included in the repository. -->

## The game

Place game coins during a ten-second betting window, then follow the wheel. A matching 2 Rolls or 4 Rolls bet opens the city bonus: dice, property multipliers and a running win total. Chance brings gifts or a multiplier for the next spin.

The game includes touch layouts, background music and a demo wallet. Balances and recent results are saved locally in your browser. No accounts, real deposits, withdrawals or cash prizes are involved. Outcomes favor placed bets for demonstration purposes; Chance has a 30% probability.

## Run locally

With Node.js 18 or later installed:

```sh
npm ci
npm run dev
```

Open http://localhost:4173. Keep the server running while you play.

`dist/` contains the editable application and can be served by a static host without a build step. JavaScript is organized into game rules, characters, scenes, effects, audio and interface modules. Styles are in `dist/styles/`; local checks and tests are in `scripts/` and `tests/`.

```sh
npm run check
npm test
```

## Credits and use

Developed by **NaorX** as a personal entertainment project. Inspired by MONOPOLY Live, but not affiliated with, endorsed by or licensed by Hasbro or Evolution. Third-party names and trademarks belong to their respective owners. No rights to those names, brands or other third-party material are granted by this repository. The Three.js MIT license is included in `dist/vendor/THREE-LICENSE.txt` and must be retained.

This is not a real-money gambling product. Anyone modifying, distributing or operating it is responsible for their own use, including obtaining any necessary permissions, licenses and regulatory approvals. This notice does not replace those requirements or override applicable law.

## Contact

For further development, custom projects or collaboration, get in touch at [NaorX.com](https://NaorX.com). More projects: [github.com/NaorX](https://github.com/NaorX).
