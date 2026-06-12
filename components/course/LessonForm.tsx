"use client";

import { ChangeEvent, useMemo, useState } from "react";
import Image from "next/image";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import RichTextEditor from "@/components/ui/RichTextEditor";
import QuizForm from "@/components/course/QuizForm";
import { uploadImage } from "@/lib/cloudinary/uploadImage";
import { detectLinks } from "@/lib/utils/detectLinks";
import { extractYoutubeId } from "@/lib/utils/extractYoutubeId";
import { LessonDraft } from "@/types/lesson";

interface LessonFormProps {
  index: number;
  lesson: LessonDraft;
  onChange: (lesson: LessonDraft) => void;
  onRemove: () => void;
}

export default function LessonForm({ index, lesson, onChange, onRemove }: LessonFormProps) {
  const [uploading, setUploading] = useState(false);

  const youtubeId = useMemo(() => extractYoutubeId(lesson.videoUrl), [lesson.videoUrl]);

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const imageUrl = await uploadImage(file, "adventskool/lessons");
      onChange({ ...lesson, imageUrl });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900">Lesson {index + 1}</h4>
        <Button type="button" variant="danger" onClick={onRemove}>
          Remove
        </Button>
      </div>

      <Input
        label="Lesson title"
        value={lesson.title}
        onChange={(event) => onChange({ ...lesson, title: event.target.value })}
      />

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Lesson content</p>
        <RichTextEditor
          value={lesson.contentHTML}
          onChange={(value) => onChange({ ...lesson, contentHTML: detectLinks(value) })}
        />
      </div>

      <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
        Lesson image
        <input type="file" accept="image/*" onChange={handleImageUpload} />
        {uploading ? <span className="text-xs text-slate-500">Uploading image...</span> : null}
        {lesson.imageUrl ? (
          <Image
            src={lesson.imageUrl}
            alt="Lesson asset"
            width={1024}
            height={256}
            className="h-32 w-full rounded-md object-cover"
          />
        ) : null}
      </label>

      <Input
        label="Video URL"
        value={lesson.videoUrl ?? ""}
        placeholder="https://youtube.com/watch?v=..."
        onChange={(event) => onChange({ ...lesson, videoUrl: event.target.value })}
      />
      {youtubeId ? <p className="text-xs text-slate-600">Detected YouTube ID: {youtubeId}</p> : null}

      <QuizForm value={lesson.quiz} onChange={(quiz) => onChange({ ...lesson, quiz })} />
    </div>
  );
}
