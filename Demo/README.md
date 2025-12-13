# VROOM User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Setting Up API Providers](#setting-up-api-providers)
4. [Creating AI Agents](#creating-ai-agents)
5. [Working with Rooms](#working-with-rooms)
6. [Starting a Session](#starting-a-session)
7. [Managing Sessions](#managing-sessions)
8. [One-on-One Conversations](#one-on-one-conversations)

---

## Getting Started

VROOM is a multi-agent collaboration platform that enables AI agents to work together on complex topics through structured deliberation sessions. The platform supports different collaboration methodologies and workflows to match various problem-solving approaches.

### First Login

1. Access the application through your web browser
2. Sign in using your credentials
3. You'll land on the Dashboard with quick setup options

---

## Dashboard Overview

The Dashboard is your central hub, showing:

- **AI Agents**: Number of configured agents available
- **Rooms**: Collaboration spaces with predefined workflows
- **Sessions**: Total deliberations completed
- **API Providers**: Connected AI service providers

### Quick Actions
- **Start Session**: Launch a new multi-agent deliberation
- **Configure Providers**: Set up API credentials
- **Create Agent**: Build a new AI agent
- **View Recent Sessions**: Access your latest deliberations with status indicators:
  - Draft (gray): Not yet started
  - Running (pulsing): Currently active
  - Completed (green): Successfully finished
  - Cancelled (red): Stopped before completion

---

## Setting Up API Providers

Before creating agents, you need to configure at least one API provider.

### Steps:
1. Navigate to **Settings** from the sidebar
2. Click **Add Provider**
3. Select provider type:
   - OpenAI
   - Anthropic
   - Perplexity
   - Custom
4. Enter your credentials:
   - **Name**: A friendly name for this configuration
   - **API Key**: Your provider's API key
   - **Model** (optional): Specific model to use
5. Click **Save**

**Tip**: You can configure multiple providers and assign different providers to different agents for optimal performance.

---

## Creating AI Agents

Agents are the participants in your deliberation sessions. Each agent can have a unique personality, expertise, and role.

### Steps:
1. Go to **Agents** from the sidebar
2. Click **Create New Agent**
3. Configure your agent:
   - **Name**: Agent's display name
   - **Description**: What this agent specializes in
   - **System Prompt**: Instructions that define the agent's behavior and expertise
   - **Icon**: Visual representation
   - **Color**: Theme color for easy identification
   - **Provider**: Which API provider this agent uses
4. Click **Create Agent**

### System Agents
VROOM includes pre-configured system agents like:
- **Archimede**: Analytical and methodical problem-solver
- **Atlas**: Strategic thinker with executive perspective

These cannot be deleted but can be used in any session.

---

## Working with Rooms

Rooms are pre-configured collaboration spaces that define how agents work together.

### System Rooms

VROOM provides several built-in methodologies:

#### Analytical Structured
Systematic, data-driven approach with clear phases:
- Analysis
- Synthesis
- Conclusions
- Recommendations

#### Strategic Executive
Executive-level strategic thinking:
- Situation assessment
- Strategic options
- Implementation planning
- Risk evaluation

#### Creative Brainstorming
Free-flowing ideation and innovation:
- Divergent thinking
- Idea generation
- Concept combination
- Refinement

#### Lean Iterative
Fast, iterative problem-solving:
- Quick analysis
- Hypothesis testing
- Rapid iteration
- Continuous improvement

#### Parallel Ensemble
Multiple perspectives analyzed simultaneously:
- Independent analysis
- Perspective comparison
- Synthesis
- Unified conclusions

#### Group Chat
Informal, conversational exchange of ideas

### Creating Custom Rooms

1. Navigate to **Rooms**
2. Click **Create New Room**
3. Configure:
   - **Name**: Room identifier
   - **Description**: Purpose and use case
   - **Methodology**: Select collaboration approach
   - **Workflow Type**:
     - Sequential Pipeline: Agents contribute in order
     - Cyclic: Agents iterate in rounds
     - Concurrent: Agents work simultaneously
   - **Agents**: Pre-select which agents participate
   - **Max Rounds**: Number of deliberation cycles
   - **Objective Template**: Pre-filled goal statement
4. Click **Create Room**

---

## Starting a Session

Sessions are where the actual deliberation happens.

### Quick Start:
1. Click **Start Session** from the Dashboard or **Sessions** page
2. Follow the 3-step wizard:

#### Step 1: Choose a Room (Optional)
- **Use Room Advisor**: Answer questions to find the best methodology
- **Select System Room**: Choose from pre-configured options
- **Select Custom Room**: Use your own rooms
- **Skip**: Create a custom session from scratch

#### Step 2: Define the Topic
- **Topic**: What question or problem should be addressed?
- **Objective**: Specific goals or desired outcomes
- **Number of Rounds**: How many deliberation cycles (3, 5, or 7)

#### Step 3: Select Agents
- Choose at least 2 agents to participate
- **Provider Override**: Optionally specify which API provider each agent should use
- **Global Provider**: Apply the same provider to all agents at once

3. Click **Create Session**

---

## Managing Sessions

### Session View

Once a session is created, you'll see:

- **Session Info**:
  - Topic and objective
  - Current round / total rounds
  - Status indicator
  - Room methodology (if used)

- **Control Panel**:
  - **Start**: Begin the deliberation
  - **Pause**: Temporarily stop
  - **Resume**: Continue from where you left off
  - **Stop**: End the session early
  - **Export**: Download the full transcript

### Reading Results

The session view displays:
- **Agent contributions** with color-coded headers
- **Round indicators** showing deliberation progress
- **Timestamps** for each contribution
- **Final synthesis** when completed

### Session Status

- **Draft**: Created but not started
- **Running**: Currently deliberating
- **Completed**: Successfully finished all rounds
- **Cancelled**: Stopped before completion

---

## One-on-One Conversations

For direct interaction with a single agent:

1. Navigate to **One-on-One** from the sidebar
2. Select an agent from the list
3. Type your message in the input field
4. The agent will respond based on its system prompt and expertise

**Use Cases**:
- Test agent configurations
- Quick questions
- Explore agent perspectives
- Draft ideas before a full session

---

## Tips for Best Results

### Agent Selection
- Choose agents with complementary expertise
- Use 2-4 agents for focused discussions
- Use 5+ agents for comprehensive analysis

### Topic Definition
- Be specific about the problem
- Include relevant context
- Define clear success criteria
- Use the objective field to guide agents

### Methodology Selection
- **Analytical**: For data-driven problems
- **Strategic**: For business decisions
- **Creative**: For innovation challenges
- **Lean**: For rapid prototyping
- **Parallel**: For multi-perspective analysis
- **Group Chat**: For open exploration

### Round Configuration
- **3 rounds**: Quick insights
- **5 rounds**: Balanced depth
- **7 rounds**: Thorough analysis

### Provider Management
- Use faster models for ideation
- Use advanced models for complex reasoning
- Mix providers for diverse perspectives
- Set agent-specific providers for specialized tasks

---

## Troubleshooting

### No Agents Available
Create at least one agent or use system agents before starting a session.

### Provider Errors
Verify your API key is correct and has sufficient credits.

### Session Won't Start
Ensure you've selected at least 2 agents and defined a topic.

### Agents Not Responding
Check that the selected provider is properly configured and accessible.

---

## Next Steps

1. Configure your API providers
2. Create 2-3 agents with different specializations
3. Start with a system room to learn the flow
4. Experiment with different methodologies
5. Create custom rooms for your specific use cases
6. Export and share successful deliberations

For technical setup and development information, see the main README in the project root.
