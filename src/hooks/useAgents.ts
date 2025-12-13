import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  avatar_url: string | null;
  system_prompt: string;
  is_system: boolean;
  temperature: number;
  max_tokens: number;
  unlimited_tokens: boolean;
  provider_profile_id: string | null;
  source_system_agent_id: string | null;
  user_id: string | null;
}

/**
 * Fetches agents with proper handling of user-personalized copies of system agents.
 * When a user has personalized a system agent, only the personalized copy is returned,
 * not the original system agent. This ensures each user sees their own customizations.
 */
export function useAgents() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['agents', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('is_system', { ascending: false })
        .order('name');
      if (error) throw error;
      
      const allAgents = data as Agent[];
      
      // Find IDs of system agents that have been personalized by this user
      const personalizedSystemAgentIds = new Set(
        allAgents
          .filter(a => a.source_system_agent_id && a.user_id === user?.id)
          .map(a => a.source_system_agent_id)
      );
      
      // Filter: keep all user agents + system agents that aren't personalized
      return allAgents.filter(agent => {
        // Keep all non-system agents (user's own or personalized copies)
        if (!agent.is_system) return true;
        // For system agents, only show if user hasn't personalized it
        return !personalizedSystemAgentIds.has(agent.id);
      });
    },
    enabled: !!user,
  });
}

/**
 * Similar to useAgents but returns all agents for selection purposes
 * (e.g., in room builder where you might want to reference original system agents)
 */
export function useAllAgents() {
  return useQuery({
    queryKey: ['all-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('is_system', { ascending: false })
        .order('name');
      if (error) throw error;
      return data as Agent[];
    },
  });
}
