import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Her testten sonra DOM'u temizle — aksi halde bir önceki testin bileşenleri
// sorgulara karışır.
afterEach(() => {
    cleanup();
});
