// @ts-check
import { defineConfig } from 'astro/config';
import wix from "@wix/astro";
import wixPages from "@wix/astro-pages";
import wixHosting from "@wix/astro-wix-hosting-adapter";
import react from "@astrojs/react";

export default defineConfig({
  adapter: wixHosting(),
  integrations: [wix(), wixPages(), react()],
  output: "server",
});