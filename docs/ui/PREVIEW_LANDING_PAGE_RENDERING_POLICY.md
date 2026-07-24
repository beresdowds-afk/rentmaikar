# Preview Landing Page Rendering Policy

**Project:** RentMaikar

## Purpose

This document defines the expected rendering behavior for the RentMaikar landing page to ensure consistency between the development preview, staging environments, and production deployments.

---

# Objectives

The landing page preview must accurately represent the production user experience while ensuring that the correct regional content and approved hero imagery are displayed.

---

# Policy 1 — Region-Aware Landing Page

The application preview shall always render the Region-Aware Landing Page.

The preview must not display:

- Generic fallback landing pages
- Legacy landing pages
- Placeholder landing pages
- Cached landing page variants
- Development-only landing pages

Instead, the preview shall initialize using the same region detection logic used in production.

If region detection cannot determine the visitor's location, the application shall load the configured default region.

---

# Policy 2 — Approved Hero Background

The landing page hero section shall always display the approved zoomed-out vehicle background image.

The approved image must satisfy the following requirements:

- Complete vehicles remain visible.
- No vehicle is cropped.
- Vehicle proportions remain natural.
- The image preserves adequate spacing around all featured vehicles.
- The image supports responsive layouts across desktop, tablet, and mobile devices.

---

# Prohibited Hero Images

The following must never appear as the landing page background:

- Older cropped vehicle images
- Legacy hero artwork
- Placeholder images
- Development assets
- Cached preview images
- Previously uploaded hero backgrounds that are no longer designated as current

---

# Preview Consistency Requirements

Development Preview, Staging, and Production shall all render:

- identical landing page layouts
- identical hero backgrounds
- identical responsive behavior
- identical regional landing page selection logic

The preview environment must not retain obsolete cached assets after a deployment.

---

# Asset Selection Rules

The application shall always use the currently approved hero background asset referenced by the active configuration.

Previously uploaded images shall not be selected automatically due to cache persistence or historical asset references.

---

# Cache Policy

After deployment:

- invalidate image caches
- invalidate browser caches where appropriate
- refresh CDN assets
- purge obsolete hero image references

The latest approved hero background must become the only image used for rendering.

---

# Acceptance Criteria

A deployment is considered successful only when:

- the preview displays the Region-Aware Landing Page;
- the approved zoomed-out vehicle hero image is displayed;
- complete vehicles are visible without unintended cropping;
- no legacy landing page is rendered;
- no deprecated hero image appears in preview or production; and
- preview and production render the same landing page experience.

---

# Implementation Notes

Developers should ensure that:

- hero image references are resolved from the active application configuration;
- stale asset references are removed during deployment;
- preview environments do not reuse deprecated cached images; and
- any image optimization pipeline preserves the intended framing of the approved hero background.

---

## Status

**Policy:** Active

This document serves as the authoritative rendering policy for the RentMaikar landing page and preview environments.
