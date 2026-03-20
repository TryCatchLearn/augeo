---
name: quiz-me

description: Generates a short quiz about code in this codebase to help the user check their understanding of the codebase. Only triggers on explicit request - when user says "quiz me", "test my understanding", or "/quiz". Does NOT auto-trigger.
---

# Quiz Me

Generate a short multiple-choice quiz about code in this auction app codebase. Questions should be based on actual code that exists in the project right now, not generic programming trivia.
 
## How It Works

1. Read the codebase to understand what is currently built.
2. Generate 5 questions based on real code.
3. Present questions one at a time and wait for the users answer.
4. After each answer, explain why the correct answer is correct and reference the specific file and code.
5. After all questions, give a summary score with suggested areas to review.

## Question Types  

Mix these across the 5 questions:

- **What does this do?**: Show a small snippet from the codebase and ask what it does.
- **What would happen if?**: Ask what would happen if a concrete piece were removed or changed.
- **Where does this live?**: Ask which file handles a specific behavior.
- **Why this approach?**: Ask why a component uses one approach instead of another based on real implementation choices.
- **Spot the dependency**: Ask which components or behavior would break if a concrete dependency changed.  

## Question Rules  

- Provide 4 answer choices per question (A-D).
- Include exactly one correct answer.
- Make wrong answers plausible, not silly.
- Reference real code in the project for every question and cite the file path.
- Scale difficulty to what has been built so far and avoid asking about unimplemented phases.
- Avoid trick questions; prioritize confidence and learning.  

## Presenting Questions  

Format each question like this:

```markdown
### Question 1 of 5

In `src/components/BidButton.tsx`, what happens when the server returns an error after placing a bid? 

A) The page refreshes automatically
B) An error toast is shown and the button re-enables
C) The bid is retried up to 3 times
D) The component unmounts and redirects to the listings page

```

Wait for the users answer before revealing the explanation.

## After Each Answer

Use this response style:  

```markdown

Nice one! / Good effort, let's look at why. The answer is B.
 
The `handleBid` function in `src/components/BidButton.tsx` catches the error
and calls `toast.error()` to show the message, then sets `isLoading` back to
false which re-enables the button. You can see this in the catch block.

```

Keep explanations to 2-3 sentences, reference the file, and be specific.  

## After All Questions

Use this summary format:  

```markdown

## Score: X/5

  
Strong areas: [what they got right; name the concepts]

Worth reviewing: [what they got wrong; name the files and concepts to revisit]

```  

## Tone

- Keep tone encouraging, not exam-like.
- Prefer phrasing like "Nice one!" and "Good effort, let's look at why...".
- Optimize for learning and confidence, not assessment.