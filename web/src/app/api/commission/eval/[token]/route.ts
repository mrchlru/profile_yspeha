import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";



import {

  loadCommissionEvalSheetByToken,

  saveCommissionEvalSheet,

} from "@/lib/commission/commissionEvalSheets";

import type { CommissionScaleAnswers, CommissionVariableAnswer } from "@/lib/commission/commissionEvalConstants";

import {

  COMMISSION_EVAL_PUBLIC_SAVE_ERROR,

  resolveCommissionEvalFailureKind,

  resolveCommissionEvalFailureQuestionText,

} from "@/lib/commission/commissionEvalSaveErrors";

import { logCommissionEvalSaveFailure } from "@/lib/commission/logCommissionEvalSaveFailure";

import { prisma } from "@/lib/prisma";



export const dynamic = "force-dynamic";



type RouteContext = {

  params: Promise<{ token: string }>;

};



export async function GET(

  _req: NextRequest,

  context: RouteContext

): Promise<NextResponse<{ sheet: unknown } | { error: string }>> {

  const { token } = await context.params;

  const sheet = await loadCommissionEvalSheetByToken(decodeURIComponent(token));

  if (!sheet) {

    return NextResponse.json({ error: "Ссылка недействительна" }, { status: 404 });

  }

  return NextResponse.json({ sheet });

}



const bodySchema = z.object({

  scaleAnswers: z.record(z.string(), z.number()),

  variableAnswers: z.array(

    z.object({

      questionText: z.string(),

      conclusion: z.string(),

    })

  ),

  submit: z.boolean(),

});



export async function POST(

  req: NextRequest,

  context: RouteContext

): Promise<NextResponse<{ submitted: boolean } | { error: string }>> {

  const { token } = await context.params;

  const accessToken = decodeURIComponent(token);



  let body: unknown;

  try {

    body = await req.json();

  } catch {

    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });

  }



  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {

    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });

  }



  const sheetRow = await prisma.commissionEvalSheet.findUnique({

    where: { accessToken },

    select: {

      memberId: true,

      interviewFolderKey: true,

      candidateFolderKey: true,

    },

  });



  try {

    const result = await saveCommissionEvalSheet({

      accessToken,

      scaleAnswers: parsed.data.scaleAnswers as CommissionScaleAnswers,

      variableAnswers: parsed.data.variableAnswers as CommissionVariableAnswer[],

      submit: parsed.data.submit,

    });

    return NextResponse.json(result);

  } catch (error) {

    if (sheetRow) {

      const member = await prisma.interviewCommissionMember.findUnique({

        where: { id: sheetRow.memberId },

        select: { firstName: true, lastName: true },

      });



      if (member) {

        const errorMessage = error instanceof Error ? error.message : "Не удалось сохранить анкету";

        await logCommissionEvalSaveFailure({

          memberLastName: member.lastName,

          memberFirstName: member.firstName,

          questionText: resolveCommissionEvalFailureQuestionText(

            error,

            parsed.data.variableAnswers

          ),

          errorMessage,

          failureKind: resolveCommissionEvalFailureKind(error),

          interviewFolderKey: sheetRow.interviewFolderKey,

          candidateFolderKey: sheetRow.candidateFolderKey,

          memberId: sheetRow.memberId,

        });

      }

    }



    return NextResponse.json({ error: COMMISSION_EVAL_PUBLIC_SAVE_ERROR }, { status: 400 });

  }

}

