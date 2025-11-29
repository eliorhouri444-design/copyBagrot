// Logic to calculate study plan
// Returns: { dailyTasks, requirements, readiness }

export const calculateStudyPlan = ({
    userProfile, 
    userAttempts, 
    examAttempts, 
    allTopics,
    isPremium
}) => {
    if (!userProfile) return null;

    const { target_score, daily_availability_minutes, exam_date, unit_level } = userProfile;
    
    // 1. Calculate Time Remaining
    const today = new Date();
    const examDay = new Date(exam_date);
    const daysUntilExam = Math.max(1, Math.ceil((examDay - today) / (1000 * 60 * 60 * 24)));
    
    // 2. Calculate Gaps
    const totalQuestions = userAttempts.length;
    const totalExams = examAttempts.length;
    
    // Weakness Analysis
    const topicStats = {};
    userAttempts.forEach(a => {
        if (a.topic_id) {
            if (!topicStats[a.topic_id]) topicStats[a.topic_id] = { correct: 0, total: 0 };
            topicStats[a.topic_id].total++;
            if (a.status === 'correct' || a.percentage >= 70) topicStats[a.topic_id].correct++;
        }
    });
    
    const weakTopics = Object.entries(topicStats)
        .filter(([_, stats]) => (stats.correct / stats.total) < 0.75 && stats.total >= 3)
        .map(([id, _]) => id);
        
    const activeMistakes = userAttempts.filter(a => (a.status === 'incorrect' || a.percentage < 60) && !a.corrected).length;

    // 3. Define Requirements based on Target Score
    // Base requirements for score 85: 500 questions, 6 exams
    // Scale based on target_score (55-100)
    const scoreFactor = target_score / 85;
    const targetQuestions = Math.round(500 * scoreFactor * (unit_level / 3)); // More units = more work
    const targetExams = Math.round(6 * scoreFactor);
    
    const questionsNeeded = Math.max(0, targetQuestions - totalQuestions);
    const examsNeeded = Math.max(0, targetExams - totalExams);
    
    // 4. Distribute Workload
    // Daily Questions = Remaining / Days
    let dailyQuestions = Math.ceil(questionsNeeded / daysUntilExam);
    
    // Adjust for availability (Assume ~2 min per question)
    const maxQuestionsByTime = Math.floor((daily_availability_minutes * 0.6) / 2); // 60% of time for questions
    const isOverloaded = dailyQuestions > maxQuestionsByTime;
    
    if (isOverloaded) {
        // Warn or cap? We cap for the plan, but flag it
        dailyQuestions = maxQuestionsByTime;
    }
    
    // Daily Exam Prep (Simulations)
    // If close to exam (last 30 days), allocate time for full exams
    let dailyExams = 0;
    if (daysUntilExam <= 30 && examsNeeded > 0) {
        // Distribute exams over weekends or every few days
        // Simple logic: 1 exam per week until done, or more if urgent
        dailyExams = 0; // Exams are usually singular large tasks
    }

    // 5. Construct Daily Tasks
    const tasks = [];
    let usedTime = 0;
    
    // Priority 1: Mistakes (Fixing is learning)
    if (activeMistakes > 0 && usedTime < daily_availability_minutes) {
        const timeForMistakes = Math.min(15, daily_availability_minutes - usedTime);
        const count = Math.floor(timeForMistakes / 3); // 3 min per mistake fix
        if (count > 0) {
            tasks.push({
                type: 'mistakes',
                title: 'תיקון טעויות',
                description: `חזור על ${count} שאלות שטעית בהן`,
                duration: count * 3,
                count: count,
                route: 'CustomWeakPractice',
                priority: 'high'
            });
            usedTime += count * 3;
        }
    }
    
    // Priority 2: Weak Topics
    if (weakTopics.length > 0 && usedTime < daily_availability_minutes) {
        const timeForTopic = Math.min(20, daily_availability_minutes - usedTime);
        if (timeForTopic >= 10) {
            tasks.push({
                type: 'topic',
                title: 'חיזוק נושא חלש',
                description: 'תרגול ממוקד בנושאים הדורשים שיפור',
                duration: timeForTopic,
                count: 1, // 1 topic session
                route: 'WeakAreaSelection',
                priority: 'high'
            });
            usedTime += timeForTopic;
        }
    }
    
    // Priority 3: Volume Practice (New Questions)
    if (dailyQuestions > 0 && usedTime < daily_availability_minutes) {
        const timeForQuestions = Math.min(dailyQuestions * 2, daily_availability_minutes - usedTime);
        const actualQuestions = Math.floor(timeForQuestions / 2);
        
        if (actualQuestions > 0) {
            tasks.push({
                type: 'questions',
                title: 'תרגול שוטף',
                description: `פתרון ${actualQuestions} שאלות חדשות`,
                duration: actualQuestions * 2,
                count: actualQuestions,
                route: 'Practice',
                priority: 'medium'
            });
            usedTime += actualQuestions * 2;
        }
    }
    
    // Priority 4: Exam Simulation (Only if plenty of time or weekend)
    const isWeekend = new Date().getDay() === 5 || new Date().getDay() === 6;
    if ((isWeekend || daysUntilExam < 14) && examsNeeded > 0 && daily_availability_minutes >= 60) {
        // Suggest exam INSTEAD of other things if it fits, or add it
        // Here we just add it as an option if user has >= 60 min availability
        if (!tasks.some(t => t.type === 'exam')) { // Don't dupe
             tasks.push({
                type: 'exam',
                title: 'סימולציית בגרות',
                description: 'מבחן מלא לתרגול זמנים',
                duration: 90, // Fixed duration usually
                count: 1,
                route: 'Exams',
                priority: 'critical'
            });
        }
    }

    // 6. Readiness Score Calculation
    const topicMastery = Math.min(100, Math.round((Object.keys(topicStats).length / (allTopics.length || 1)) * 100)); // Rough approx
    const examMastery = Math.min(100, Math.round((totalExams / targetExams) * 100));
    const questionVolume = Math.min(100, Math.round((totalQuestions / targetQuestions) * 100));
    
    const readinessScore = Math.round((topicMastery * 0.3) + (examMastery * 0.4) + (questionVolume * 0.3));

    return {
        dailyPlan: {
            tasks,
            totalMinutes: usedTime,
            isOverloaded
        },
        requirements: {
            questions: { target: targetQuestions, current: totalQuestions, needed: questionsNeeded },
            exams: { target: targetExams, current: totalExams, needed: examsNeeded },
            daysUntilExam
        },
        readiness: {
            score: readinessScore,
            gap: Math.max(0, target_score - readinessScore)
        },
        stats: {
            weakTopicsCount: weakTopics.length,
            mistakesCount: activeMistakes
        }
    };
};