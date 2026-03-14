import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'color',
      title: 'Color',
      type: 'string',
      description: 'Tailwind color class (e.g. crayon-orange, crayon-teal)',
      options: {
        list: [
          { title: 'Orange', value: 'crayon-orange' },
          { title: 'Teal', value: 'crayon-teal' },
          { title: 'Pink', value: 'crayon-pink' },
          { title: 'Yellow', value: 'crayon-yellow' },
          { title: 'Purple', value: 'crayon-purple' },
          { title: 'Green', value: 'crayon-green' },
        ],
      },
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'description',
    },
  },
});
