import "server-only";
import { z } from "zod";
import { defineTool, type AgentTool } from "./defineTool";
import { getSupabase } from "../supabase";
import { CURRENT_USER_ID } from "../currentUser";

const searchKnowledgeBase = defineTool({
  name: "searchKnowledgeBase",
  description:
    "Use this when the user asks for help with an IT issue and relevant knowledge base articles may provide a solution. Returns at most 20 matching articles.",
  schema: z.object({
    query: z.string().describe("Text to search for in article titles and keywords"),
  }),
  run: async ({ query }) => {
    const escapedQuery = query
      .replace(/\\/g, "\\\\")
      .replace(/[%_]/g, "\\$&")
      .replace(/"/g, '\\"');
    const pattern = `"%${escapedQuery}%"`;
    const { data, error } = await getSupabase()
      .from("kb_articles")
      .select("id, title, category, solution_steps")
      .or(`title.ilike.${pattern},keywords.ilike.${pattern}`)
      .limit(20);
    if (error) throw new Error(error.message);
    return { articles: data };
  },
});

const getMyTickets = defineTool({
  name: "getMyTickets",
  description:
    "Use this when the user asks to see or check the status of their IT tickets. Returns at most 20 of their tickets, newest first.",
  schema: z.object({}),
  run: async () => {
    const { data, error } = await getSupabase()
      .from("tickets")
      .select("id, title, status, priority, created_at")
      .eq("employee_id", CURRENT_USER_ID)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return { tickets: data };
  },
});

const createTicket = defineTool({
  name: "createTicket",
  description:
    "Use this when the knowledge base does not solve the issue, or the user explicitly asks to create a support ticket. Maps priority (P1=many users blocked/security, P2=one user blocked, P3=work slowed, P4=request).",
  writes: true,
  schema: z.object({
    title: z.string().min(5).describe("Short title of the support issue"),
    description: z.string().describe("Details about the support issue"),
    category: z.string().describe("Category of the support issue"),
    priority: z.enum(["P1", "P2", "P3", "P4"]).describe("Support ticket priority"),
  }),
  run: async ({ title, description, category, priority }) => {
    const supabase = getSupabase();
    const { data: slaRule, error: slaError } = await supabase
      .from("sla_rules")
      .select("priority")
      .eq("priority", priority)
      .maybeSingle();
    if (slaError) throw new Error(slaError.message);
    if (!slaRule) {
      throw new Error(`Priority ${priority} does not have an active SLA rule.`);
    }

    const { data: categoryArticles, error: categoryError } = await supabase
      .from("kb_articles")
      .select("team_id")
      .eq("category", category);
    if (categoryError) throw new Error(categoryError.message);
    const teamIds = [...new Set(categoryArticles.map((article) => article.team_id))];
    if (teamIds.length !== 1) {
      throw new Error(
        teamIds.length === 0
          ? `No support team is configured for the ${category} category.`
          : `More than one support team is configured for the ${category} category.`
      );
    }

    const { data, error } = await supabase
      .from("tickets")
      .insert({
        employee_id: CURRENT_USER_ID,
        title,
        description,
        category,
        priority,
        team_id: teamIds[0],
      })
      .select("id, title, priority, status")
      .single();
    if (error) throw new Error(error.message);
    return { created: data };
  },
});

/** Every tool in this list is given to Gemini. */
export const tools: AgentTool[] = [searchKnowledgeBase, getMyTickets, createTicket];
