interface QuestionMapProps {
  total: number;
  currentIndex: number;
  answers: Record<string, string | null>;
  itemIds: string[];
  correctSet?: Set<string>;
  incorrectSet?: Set<string>;
  onSelect: (index: number) => void;
}

export function QuestionMap({ total, currentIndex, answers, itemIds, correctSet, incorrectSet, onSelect }: QuestionMapProps) {
  return (
    <div className="question-map" role="group" aria-label="Question map">
      {Array.from({ length: total }, (_, i) => {
        const itemId = itemIds[i];
        const answered = Boolean(answers[itemId]);
        const isCurrent = i === currentIndex;
        const isCorrect = correctSet?.has(itemId);
        const isIncorrect = incorrectSet?.has(itemId);

        const classes = [
          'question-map__chip',
          isCurrent ? 'is-current' : '',
          isCorrect ? 'is-correct' : '',
          isIncorrect ? 'is-incorrect' : '',
          answered && !isCorrect && !isIncorrect ? 'is-answered' : ''
        ].filter(Boolean).join(' ');

        return (
          <button
            key={itemId}
            className={classes}
            onClick={() => onSelect(i)}
            aria-label={`Item ${i + 1}${isCorrect ? ', correct' : ''}${isIncorrect ? ', incorrect' : ''}${isCurrent ? ', current' : ''}`}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
