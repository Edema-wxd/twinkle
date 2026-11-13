# Writing for the Twinkle Locs blog

A guide for whoever writes posts in **Admin → Blog**.

## Three ways to get a post in

1. **Write it in the editor.**
   - **H2** starts a section and **H3** adds a small gold label.
   - The quote button makes a pull quote, and `•••` adds a bead divider.
   - The grid button inserts a table. While your cursor is inside a table, a second bar appears for adding or removing rows and columns.
2. **Paste Markdown.** Copy Markdown from Notion, Obsidian, ChatGPT, a text file or anywhere else, and paste it into the story. It's converted on paste, including headings, bold, links, lists, quotes and tables.
3. **Import a Markdown file.** Click **Import Markdown** (top bar), or drag a `.md` file straight into the editor. Select or drop the post's images at the same time. Any image the file refers to by name, such as `images/gold.jpg`, is uploaded automatically.

Images from other websites are copied into Twinkle Locs storage so they keep working. If one can't be copied, a note above the editor tells you which. Insert it yourself with the image button, or by dragging the photo in.

## Optional front matter

Put this at the very top of a Markdown file to fill the side panel for you:

```markdown
---
title: Gold vs silver loc beads, which suits you?
description: A quick guide to choosing your first set.   # becomes the teaser
category: Guides
slug: gold-vs-silver                                    # the web address
cover: images/cover.jpg                                 # or an https:// link
---
```

Without front matter, the first `# Heading` becomes the title, and a short first paragraph becomes the teaser.

## Tables in Markdown

```markdown
| Bead size | Best for         | Beads per pack |
|-----------|------------------|----------------|
| 4mm       | Microlocs        | 100            |
| 6mm       | Traditional locs | 50             |
```

On phones, a wide table scrolls sideways inside its own box.

## Links

- Link to a product with `/catalog/the-product` and a post with `/blog/the-post`.
- Links to `twinklelocs.com/...` are turned into internal links automatically.
- Links to other `.md` files are flagged, because they won't work on the site.

## Before you publish

- Follow the **Promotion checklist** in the side panel: 300+ words, an H2, a cover photo, a 70 to 160 character teaser, a product link and image descriptions.
- For the cover, **Choose from uploaded photos** (or **Choose from library** to swap one) reuses any photo already uploaded for a product, post or page. Search by file name, product or post title, or filter to photos **Not used yet**. A **Tall** label means the photo is portrait and will be cropped on cards and link previews.
- To add photos inside the post, click the image button in the toolbar and choose **Upload from your device** or **Choose from uploaded photos**. From the library you can pick several at once. They go in at the cursor, in the order you picked them. Photos already in the post are marked **In this post**.
- To change a photo in the post, click it and choose **Swap photo**. Its description (alt text) is kept.
- Products have the same library: under **Product images**, choose **Choose from uploaded photos**. Product photos show as squares, so very wide or tall photos are labelled **Wide** or **Tall**.
- The About page has it too: each section has **Choose from uploaded photos** under its image. Those images show as a wide strip, so square or tall photos are labelled **Square** or **Tall** (only their top part shows). Remember to press **Save all sections**.
- Removing a photo from a product, post or page only deletes the file once nothing else on the site uses it, so sharing photos is safe.
- After uploading an image, click it and choose **Describe image** to add alt text.
- **Shop the look** adds up to 4 products at the end of the post.

## Safety nets

- Unsaved work is kept in your browser. If the tab closes, reopen the post and choose **Restore them**.
- Leaving the editor with unsaved changes asks you first.
- On a live post, **Update live post** publishes your changes straight away. Use **Unpublish** to take it down.
- Renaming a live post's web address keeps the old link working. Anyone with the old link is redirected to the new one.

## Google Preferred Sources

Every post (and the blog page) ends with an **"Add as a preferred source"** button. Readers who tap it add twinklelocs.com to their Google preferred sources, so our posts show up more for them in Google Search, Top Stories, AI Overviews and AI Mode. It's the whole site, not one post, so one tap covers everything we publish.

You can share the same link anywhere, for example in an Instagram bio, a WhatsApp broadcast or the newsletter: https://www.google.com/preferences/source?q=twinklelocs.com

Google doesn't show how many people have added us.

## Newsletter

Admin → **Newsletter** emails everyone who joined from the footer or the blog.

1. **Write:** a subject (type `{name}` for each person's first name), optional preview text (shown after the subject in the inbox), an optional photo, the message, and an optional button (for example "Shop the collection" → `/catalog`). The preview on the right shows exactly what subscribers get.
2. **Send a test to yourself** and check it on your phone.
3. **Send to N subscribers…**, then confirm. It sends in small batches with a progress bar (roughly 2 emails a second). You can pause and resume; nobody gets the same newsletter twice. If someone's address fails (for example a full or closed mailbox), you can retry them at the end.

Every newsletter has an unsubscribe link and Gmail/Yahoo's one-click unsubscribe; unsubscribing removes the person from the list. **Subscribers** lets you search, remove someone who asked by message, and export a CSV. **Sent** shows past newsletters with how many were delivered and opened (needs the Resend webhook, see Admin → Emails).

**Welcome email:** everyone who joins gets a welcome email straight away, once per address, with an unsubscribe link. Edit it (or switch it off) under Newsletter → **Welcome email**; "Reset to the default wording" brings back the original. People who were already subscribed don't get it. The sign-up form ignores obvious bots, and welcome emails pause if more than 50 go out in an hour, so the form can't be used to spam strangers from your address.

The draft is saved in your browser as you type. A send in progress is also remembered there, so if the tab closes, reopen Newsletter and press **Resume**.

