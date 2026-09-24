import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * 🕸️ Knowledge Graph - גרף ידע מקושר
 * 
 * יוצר קשרים בין נושאים וקונספטים
 */

Deno.serve(async (req) => {
  console.log("🕸️ KNOWLEDGE GRAPH");
  
  try {
    const base44 = createClientFromRequest(req);
    
    let user;
    try {
      user = await base44.auth.me();
    } catch (authError) {
      return Response.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { subject, topic } = body;

    // שלוף כל הידע בנושא
    const knowledge = await base44.asServiceRole.entities.KnowledgeBase.filter({
      subject: subject,
      active: true
    });

    // בנה גרף קשרים
    const nodes = [];
    const edges = [];
    const nodeMap = new Map();

    knowledge.forEach(item => {
      // נוד ראשי
      if (!nodeMap.has(item.topic)) {
        nodes.push({
          id: item.topic,
          label: item.topic,
          type: 'topic',
          size: 20,
          color: '#3B82F6'
        });
        nodeMap.set(item.topic, true);
      }

      // תת-נושאים
      if (item.sub_topic && !nodeMap.has(item.sub_topic)) {
        nodes.push({
          id: item.sub_topic,
          label: item.sub_topic,
          type: 'subtopic',
          size: 15,
          color: '#10B981'
        });
        nodeMap.set(item.sub_topic, true);

        // קשר
        edges.push({
          from: item.topic,
          to: item.sub_topic,
          label: 'כולל'
        });
      }

      // תגיות
      if (item.tags) {
        item.tags.forEach(tag => {
          if (!nodeMap.has(tag)) {
            nodes.push({
              id: tag,
              label: tag,
              type: 'tag',
              size: 10,
              color: '#F59E0B'
            });
            nodeMap.set(tag, true);
          }

          edges.push({
            from: item.sub_topic || item.topic,
            to: tag,
            label: 'קשור'
          });
        });
      }
    });

    return Response.json({
      success: true,
      graph: {
        nodes,
        edges
      },
      stats: {
        topics: nodes.filter(n => n.type === 'topic').length,
        subtopics: nodes.filter(n => n.type === 'subtopic').length,
        tags: nodes.filter(n => n.type === 'tag').length,
        connections: edges.length
      }
    });

  } catch (error) {
    console.error("Error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});