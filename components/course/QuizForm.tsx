"use client";

import { useId, useState } from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { QuizQuestion } from "@/types/quiz";

interface QuizFormProps {
  value: QuizQuestion[];
  onChange: (questions: QuizQuestion[]) => void;
}

function createOption(label: string) {
  return {
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    label,
  };
}

function createInitialOptions() {
  return [createOption(""), createOption("")];
}

export default function QuizForm({ value, onChange }: QuizFormProps) {
  const radioGroupName = useId();
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState(createInitialOptions);
  const [correctOptionId, setCorrectOptionId] = useState("");
  const [error, setError] = useState("");

  const updateOption = (id: string, label: string) => {
    setError("");
    setOptions((prev) => prev.map((option) => (option.id === id ? { ...option, label } : option)));
  };

  const addQuestion = () => {
    if (!questionText.trim()) {
      setError("Enter a question first.");
      return;
    }
    if (options.some((option) => !option.label.trim())) {
      setError("Fill all options before adding the question.");
      return;
    }
    const normalizedCorrectOptionId = correctOptionId || options[0]?.id || "";
    if (!normalizedCorrectOptionId) {
      setError("Add at least one valid option.");
      return;
    }

    const question: QuizQuestion = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      question: questionText,
      options,
      correctOptionId: normalizedCorrectOptionId,
    };

    onChange([...value, question]);
    setQuestionText("");
    const nextOptions = createInitialOptions();
    setOptions(nextOptions);
    setCorrectOptionId(nextOptions[0]?.id ?? "");
    setError("");
  };

  const removeQuestion = (id: string) => {
    onChange(value.filter((question) => question.id !== id));
  };

  return (
    <div className="space-y-4 rounded-md border border-slate-200 p-4">
      <h4 className="text-sm font-semibold text-slate-800">Lesson Quiz</h4>
      <Input label="Question" value={questionText} onChange={(e) => setQuestionText(e.target.value)} />
      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={option.id} className="flex items-center gap-2">
            <input
              type="radio"
              name={radioGroupName}
              checked={correctOptionId === option.id}
              onChange={() => setCorrectOptionId(option.id)}
            />
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder={`Option ${index + 1}`}
              value={option.label}
              onChange={(e) => updateOption(option.id, e.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            const nextOption = createOption("");
            setOptions((prev) => [...prev, nextOption]);
            if (!correctOptionId) {
              setCorrectOptionId(nextOption.id);
            }
          }}
        >
          Add Option
        </Button>
        <Button type="button" onClick={addQuestion}>
          Add Question
        </Button>
      </div>
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}

      {value.length ? (
        <ul className="space-y-2">
          {value.map((question, index) => (
            <li key={question.id} className="rounded-md bg-slate-50 p-2 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-3">
                <p>
                  {index + 1}. {question.question}
                </p>
                <Button type="button" variant="danger" className="px-2 py-1 text-xs" onClick={() => removeQuestion(question.id)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
