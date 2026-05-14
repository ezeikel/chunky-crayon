import { defineField, defineType } from "sanity";

export const post = defineType({
  name: "post",
  title: "Post",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      rows: 3,
      validation: (rule) => rule.required().max(240),
    }),
    defineField({
      name: "heroImage",
      title: "Hero image",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Alt text",
          type: "string",
        }),
      ],
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      of: [
        { type: "block" },
        {
          type: "image",
          options: { hotspot: true },
          fields: [{ name: "alt", title: "Alt text", type: "string" }],
        },
      ],
    }),
    defineField({
      name: "publishedAt",
      title: "Published at",
      type: "datetime",
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "siteSlug",
      title: "Site slug",
      type: "string",
      description: "Which satellite site this post belongs to.",
      initialValue: "routinecharts",
      readOnly: true,
      hidden: true,
    }),
    defineField({
      name: "sourceTopic",
      title: "Source topic",
      type: "string",
      description:
        "The topic from SATELLITE_SITES this post was generated from. Used for cron idempotency.",
      readOnly: true,
      hidden: true,
    }),
  ],
  preview: {
    select: {
      title: "title",
      media: "heroImage",
      publishedAt: "publishedAt",
    },
    prepare({ title, media, publishedAt }) {
      const date = publishedAt
        ? new Date(publishedAt).toLocaleDateString("en-GB")
        : "Unpublished";
      return { title, subtitle: date, media };
    },
  },
});
