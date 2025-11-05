import Game from "./src/modules/Game";
import { getUnifiedBalances, initNexus } from "./src/nexus/nexus";

document.addEventListener(
  "DOMContentLoaded",
  function () {
    async function init() {
      await initNexus(window.ethereum);
      const balances = await getUnifiedBalances();
      console.log(balances);
      new Game({
        spritesheet: "sprites.json",
      }).load();
    }

    init();
  },
  false
);
