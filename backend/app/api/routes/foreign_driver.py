from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.currency_service import currency_to_lkr, lkr_to_currency
from app.services.gemini_service import ask_assistant
from app.utils.response import success_response, error_response

router = APIRouter(prefix="/foreign-driver", tags=["Foreign Driver Assistance"])

class FineConvertRequest(BaseModel):
    offence: str
    amount: float
    currency: str
    is_to_lkr: bool = True  # True: convert from currency to LKR, False: convert from LKR to currency

@router.post("/fine-convert")
async def fine_convert(payload: FineConvertRequest):
    try:
        currency = payload.currency.upper()
        if payload.is_to_lkr:
            lkr_amount, rate = currency_to_lkr(payload.amount, currency)
            converted_amount = lkr_amount
            fine_amount_lkr = lkr_amount
        else:
            foreign_amount, rate = lkr_to_currency(payload.amount, currency)
            converted_amount = foreign_amount
            fine_amount_lkr = payload.amount

        offence_explanation = ask_assistant(
            f"Explain the traffic offence '{payload.offence}' in Sri Lanka. Why does this rule exist, and what are the road safety implications?",
            language="en"
        )
        tourist_guidance = ask_assistant(
            f"Provide road safety guidance for a tourist driving in Sri Lanka in relation to the offence '{payload.offence}'. Be concise.",
            language="en"
        )

        return success_response(
            message="Fine conversion completed successfully",
            data={
                "offence": payload.offence,
                "amount": payload.amount,
                "currency": currency,
                "converted_amount": converted_amount,
                "exchange_rate": rate,
                "fine_amount_lkr": fine_amount_lkr,
                "offence_explanation": offence_explanation,
                "tourist_guidance": tourist_guidance,
            }
        )
    except ValueError as e:
        return error_response(str(e), "INVALID_CURRENCY", 400)
    except Exception as e:
        return error_response(str(e), "CONVERSION_ERROR", 500)

class ExplainRequest(BaseModel):
    offence: str
    language: Optional[str] = "en"

@router.post("/explain")
async def explain_offence(payload: ExplainRequest):
    try:
        explanation = ask_assistant(
            f"Explain the traffic offence '{payload.offence}' in Sri Lanka for a tourist driving in the country. Highlight road safety implications.",
            language=payload.language
        )
        guidance = ask_assistant(
            f"Provide general safe driving tips and guidelines for foreign drivers in Sri Lanka when encountering rules related to '{payload.offence}'.",
            language=payload.language
        )
        return success_response(
            message="Offence explanation generated successfully",
            data={
                "offence": payload.offence,
                "offence_explanation": explanation,
                "tourist_guidance": guidance
            }
        )
    except Exception as e:
        return error_response(str(e), "EXPLAIN_ERROR", 500)
