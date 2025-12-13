import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { useAgents, useAllAgents, type Agent } from './useAgents';

interface TranslatableAgent {
  name: string;
  description: string | null;
  is_system?: boolean;
}

interface TranslatableRoom {
  name: string;
  description: string | null;
  is_system?: boolean;
}

export function useSystemTranslation() {
  const { t } = useTranslation();

  const translateSystemAgent = <T extends TranslatableAgent>(agent: T): T => {
    if (!agent.is_system) {
      return agent;
    }

    const translationKey = `systemAgents.${agent.name}`;
    const translatedName = t(`${translationKey}.name`, { defaultValue: agent.name });
    const translatedDescription = t(`${translationKey}.description`, { defaultValue: agent.description || '' });

    return {
      ...agent,
      name: translatedName,
      description: translatedDescription || agent.description,
    };
  };

  const translateSystemRoom = <T extends TranslatableRoom>(room: T): T => {
    if (!room.is_system) {
      return room;
    }

    const translationKey = `systemRooms.${room.name}`;
    const translatedName = t(`${translationKey}.name`, { defaultValue: room.name });
    const translatedDescription = t(`${translationKey}.description`, { defaultValue: room.description || '' });

    return {
      ...room,
      name: translatedName,
      description: translatedDescription || room.description,
    };
  };

  return {
    translateSystemAgent,
    translateSystemRoom,
  };
}

/**
 * Hook that returns agents with system agents translated based on current locale
 */
export function useTranslatedAgents() {
  const agentsQuery = useAgents();
  const { translateSystemAgent } = useSystemTranslation();

  const translatedData = useMemo(() => {
    if (!agentsQuery.data) return undefined;
    return agentsQuery.data.map(translateSystemAgent);
  }, [agentsQuery.data, translateSystemAgent]);

  return {
    ...agentsQuery,
    data: translatedData,
  };
}

/**
 * Hook that returns all agents with system agents translated based on current locale
 */
export function useTranslatedAllAgents() {
  const agentsQuery = useAllAgents();
  const { translateSystemAgent } = useSystemTranslation();

  const translatedData = useMemo(() => {
    if (!agentsQuery.data) return undefined;
    return agentsQuery.data.map(translateSystemAgent);
  }, [agentsQuery.data, translateSystemAgent]);

  return {
    ...agentsQuery,
    data: translatedData,
  };
}
