import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { prompt, type } = body;

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  // If OpenAI key is configured, use it
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an email marketing copywriter. Generate professional email content for a ${type || "general"} campaign. Return JSON with "subject" and "bodyHtml" fields. The bodyHtml should use simple HTML tags (p, strong, br, a, ul, li). Include merge fields like {{firstName}}, {{company}} where appropriate. Keep emails concise and action-oriented.`,
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
      const data = await response.json();
      const content = JSON.parse(data.choices[0].message.content);
      return NextResponse.json(content);
    } catch {
      // Fall through to demo content
    }
  }

  // Demo/fallback content generation
  const templates: Record<string, { subject: string; bodyHtml: string }> = {
    "customer-update": {
      subject: "Exciting updates from our team, {{firstName}}",
      bodyHtml: `<p>Hi {{firstName}},</p>
<p>We're excited to share some important updates with you.</p>
<p>Based on your prompt: <em>${prompt}</em></p>
<p>Here's what's new:</p>
<ul>
<li><strong>Feature Update 1</strong> — Description of the improvement</li>
<li><strong>Feature Update 2</strong> — How this benefits your workflow</li>
<li><strong>Coming Soon</strong> — Preview of upcoming features</li>
</ul>
<p>We'd love to hear your feedback. Hit reply to let us know what you think.</p>
<p>Best,<br>The Team</p>`,
    },
    "lead-warming": {
      subject: "Quick thought for you, {{firstName}}",
      bodyHtml: `<p>Hi {{firstName}},</p>
<p>I noticed {{company}} might benefit from what we've been building.</p>
<p>Based on your prompt: <em>${prompt}</em></p>
<p>Many teams like yours have seen results by:</p>
<ul>
<li>Streamlining their workflow with our platform</li>
<li>Reducing manual effort by 40%</li>
<li>Getting better visibility into their pipeline</li>
</ul>
<p>Would it make sense to set up a quick 15-minute call to explore if this could work for your team?</p>
<p>Best,<br>Your Name</p>`,
    },
    "cold-outreach": {
      subject: "Quick question, {{firstName}}",
      bodyHtml: `<p>Hi {{firstName}},</p>
<p>I came across {{company}} and thought there might be a fit.</p>
<p>Based on your prompt: <em>${prompt}</em></p>
<p>We help companies like yours solve [specific problem]. Worth a quick chat?</p>
<p>If now isn't the right time, no worries at all — just let me know.</p>
<p>Best,<br>Your Name</p>`,
    },
    "partner": {
      subject: "Partner Update: Important resources for {{company}}",
      bodyHtml: `<p>Hi {{firstName}},</p>
<p>As a valued partner, I wanted to share some key updates that will help you support your customers.</p>
<p>Based on your prompt: <em>${prompt}</em></p>
<p><strong>Key Resources:</strong></p>
<ul>
<li>Updated product documentation</li>
<li>New sales enablement materials</li>
<li>Technical integration guides</li>
</ul>
<p>Let me know if you need anything else to succeed.</p>
<p>Best,<br>Partner Team</p>`,
    },
  };

  const content = templates[type || "general"] || templates["customer-update"];
  return NextResponse.json(content);
}
