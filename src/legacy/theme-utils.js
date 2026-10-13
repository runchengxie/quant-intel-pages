// Generated from TypeScript by npm run legacy:build; do not edit.
"use strict";
var marketIntelTheme = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/legacy-source/theme-utils.ts
  var theme_utils_exports = {};
  __export(theme_utils_exports, {
    THEMES: () => THEMES,
    applyTheme: () => applyTheme,
    nextTheme: () => nextTheme,
    normalizeTheme: () => normalizeTheme
  });
  var THEMES = ["system", "light", "dark"];
  function normalizeTheme(value) {
    return value === "system" || value === "light" || value === "dark" ? value : "system";
  }
  function nextTheme(value) {
    const current = normalizeTheme(value);
    return THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
  }
  function applyTheme(value, root = document.documentElement) {
    const theme = normalizeTheme(value);
    root.dataset.theme = theme;
    root.style.colorScheme = theme === "system" ? "light dark" : theme;
    return theme;
  }
  return __toCommonJS(theme_utils_exports);
})();
if (typeof module !== "undefined" && module.exports) module.exports = marketIntelTheme;
if (typeof window !== "undefined") window.marketIntelTheme = marketIntelTheme;
