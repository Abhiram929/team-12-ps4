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

/** Every tool in this list is given to Gemini. */
export const tools: AgentTool[] = [searchKnowledgeBase, getMyTickets];
