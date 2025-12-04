import React from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, FileCheck, Download, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function BagrutCarousel({ subject, units }) {
  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['bagrut-exams', subject, units],
    queryFn: async () => {
      // Fetch active exams for this subject/unit
      const data = await base44.entities.BagrutExam.filter({
        subject_id: subject,
        unit_level: parseInt(units),
        is_active: true
      });
      // Sort by year descending, then season
      return data.sort((a, b) => b.year - a.year);
    }
  });

  if (isLoading) {
    return <div className="h-48 flex items-center justify-center bg-white/50 rounded-xl">טוען בחינות...</div>;
  }

  if (exams.length === 0) {
    return (
      <div className="text-center p-8 bg-white rounded-xl border-2 border-dashed border-gray-200">
        <p className="text-gray-500">עדיין לא הועלו בגרויות עבור {subject} {units} יח"ל.</p>
      </div>
    );
  }

  return (
    <div className="w-full px-4">
        <Carousel
          opts={{
            align: "start",
            direction: "rtl",
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {exams.map((exam) => (
              <CarouselItem key={exam.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <div className="p-1">
                  <Card className="hover:shadow-lg transition-all duration-300 border-t-4 border-t-blue-500">
                    <CardContent className="p-4 flex flex-col gap-4">
                      <div className="text-center mb-2">
                        <div className="text-sm font-medium text-gray-500">שאלון {exam.module_symbol || '-'}</div>
                        <h3 className="text-xl font-bold text-gray-900">{exam.title}</h3>
                        <div className="text-sm text-gray-600">{exam.year}</div>
                      </div>

                      <div className="space-y-2">
                        <Button 
                          className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                          onClick={() => window.open(exam.exam_file_url, '_blank')}
                        >
                          <FileText className="w-4 h-4 ml-2" />
                          צפה בטופס הבחינה
                        </Button>

                        {exam.solution_file_url ? (
                          <Button 
                            className="w-full bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                            onClick={() => window.open(exam.solution_file_url, '_blank')}
                          >
                            <FileCheck className="w-4 h-4 ml-2" />
                            צפה בפתרון המלא
                          </Button>
                        ) : (
                          <Button disabled className="w-full opacity-50 cursor-not-allowed" variant="outline">
                            <FileCheck className="w-4 h-4 ml-2" />
                            טרם פורסם פתרון
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="hidden md:block">
            <CarouselPrevious className="left-0" />
            <CarouselNext className="right-0" />
          </div>
        </Carousel>
    </div>
  );
}