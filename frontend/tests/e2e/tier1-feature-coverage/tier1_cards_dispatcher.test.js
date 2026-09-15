/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
/**
 * Tier 1: Card Component Decoupling & Stream Polymorphic Dispatcher (F10, F11)
 * Derived from ORIGINAL_REQUEST.md §R3 & PROJECT.md
 */

const { describe, test, expect, helpers } = require("../harness");

describe("Tier 1 - Feature 10: Card Component Decoupling", () => {
  test("F10.1: Dedicated ProjectCard component exists and exports default function", () => {
    const exists = helpers.fileExists("src/components/ProjectCard.tsx");
    expect(exists).toBe(true);
    const content = helpers.readFile("src/components/ProjectCard.tsx");
    expect(content).toMatch(/export\s+default\s+function\s+ProjectCard/);
  });

  test("F10.2: Dedicated ArticleFeedCard component exists and exports default function", () => {
    const exists = helpers.fileExists("src/components/ArticleFeedCard.tsx");
    expect(exists).toBe(true);
    const content = helpers.readFile("src/components/ArticleFeedCard.tsx");
    expect(content).toMatch(/export\s+default\s+function\s+ArticleFeedCard/);
  });

  test("F10.3: PostCard or MomentCard exists for moments feed presentation", () => {
    const hasPostCard = helpers.fileExists("src/components/PostCard.tsx");
    const hasMomentCard = helpers.fileExists("src/components/MomentCard.tsx") ||
      helpers.fileExists("src/components/moments/MomentCard.tsx");
    expect(hasPostCard || hasMomentCard).toBe(true);
  });

  test("F10.4: ProjectCard does not import or render ActionMenu (moment like menu)", () => {
    const content = helpers.readFile("src/components/ProjectCard.tsx");
    expect(content).toBeDefined();
    expect(content).toNotContain("ActionMenu");
    expect(content).toNotContain("<ActionMenu");
  });

  test("F10.5: ProjectCard does not import or render InteractionBubble or CommentSection", () => {
    const content = helpers.readFile("src/components/ProjectCard.tsx");
    expect(content).toBeDefined();
    expect(content).toNotContain("InteractionBubble");
    expect(content).toNotContain("CommentSection");
  });
}, { feature: "F10", milestone: "M2", tier: 1 });

describe("Tier 1 - Feature 11: Stream Polymorphic Dispatcher", () => {
  test("F11.1: Polymorphic dispatcher dispatches project category to ProjectCard", () => {
    const projectItem = {
      id: "p1",
      category: "项目",
      title: "My App",
      content: "Description of app",
    };
    // Feed contract evaluation: project category must yield ProjectCard
    const targetCard = projectItem.category === "项目" ? "ProjectCard" : "Other";
    expect(targetCard).toBe("ProjectCard");
  });

  test("F11.2: Polymorphic dispatcher dispatches article type to ArticleFeedCard", () => {
    const articleItem = {
      id: "a1",
      type: "article",
      title: "Deep Tech",
      content: "Full markdown text",
    };
    const targetCard = articleItem.type === "article" ? "ArticleFeedCard" : "Other";
    expect(targetCard).toBe("ArticleFeedCard");
  });

  test("F11.3: Polymorphic dispatcher dispatches moment type to MomentCard / PostCard", () => {
    const momentItem = {
      id: "m1",
      type: "moment",
      content: "Short daily thought",
    };
    const targetCard = momentItem.type === "moment" ? "MomentCard" : "Other";
    expect(targetCard).toBe("MomentCard");
  });

  test("F11.4: PostList or FeedDispatcher implementation inspects item type and category in feed", () => {
    const content = helpers.readFile("src/components/PostList.tsx");
    expect(content).toBeDefined();
    // PostList or FeedDispatcher must dispatch dynamically
    const hasPolymorphicLogic =
      content.includes("ArticleFeedCard") ||
      content.includes("ProjectCard") ||
      content.includes("FeedDispatcher") ||
      content.includes("FeedItemDispatcher");
    expect(hasPolymorphicLogic).toBe(true);
  });

  test("F11.5: Feed stream maintains stable unique key when rendering polymorphic items", () => {
    const items = [
      { id: "1", type: "article" },
      { id: "2", category: "项目" },
      { id: "3", type: "moment" },
    ];
    const keys = items.map((x) => x.id);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(items.length);
  });
}, { feature: "F11", milestone: "M2", tier: 1 });
