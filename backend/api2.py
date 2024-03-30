# 设置环境变量
import os

os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"

from typing import List

import torch
from transformers.models.bert import BertForSequenceClassification, BertTokenizer
from transformers.models.roberta import (
    RobertaForSequenceClassification,
    RobertaTokenizer,
)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

enable_en = False  # 是否启用英文模型


class Sentence(BaseModel):
    data: str


# 检查是否有可用的GPU设备
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

name_en = "Hello-SimpleAI/chatgpt-detector-roberta"
model_en = None
tokenizer_en = None
if enable_en:
    # 尝试加载英文模型到GPU
    try:
        model_en = RobertaForSequenceClassification.from_pretrained(name_en)
        print(f"英文模型已加载到{device}设备上")
    except:
        model_en = RobertaForSequenceClassification.from_pretrained(name_en)
        print("英文模型加载到GPU失败，已使用CPU")
    tokenizer_en = RobertaTokenizer.from_pretrained(name_en)


name_zh = "Hello-SimpleAI/chatgpt-detector-roberta-chinese"
model_zh = None
# 尝试加载中文模型到GPU
try:
    model_zh = BertForSequenceClassification.from_pretrained(name_zh)
    print(f"中文模型已加载到{device}设备上")
except:
    model_zh = BertForSequenceClassification.from_pretrained(name_zh)
    print("中文模型加载到GPU失败，已使用CPU")
tokenizer_zh = BertTokenizer.from_pretrained(name_zh)


def predict_func(text: str, tokenizer, model):
    with torch.no_grad():
        inputs = tokenizer(text, return_tensors="pt", max_length=512, truncation=True)
        outputs = model(**inputs)
        scores = outputs.logits[0].softmax(0).numpy()
        result = {"label": scores.argmax().item(), "score": scores.max().item()}
    return result


def predict_en(text: str) -> List:
    id2label = ["Human", "ChatGPT"]
    res = predict_func(text, tokenizer_en, model_en)
    if id2label[res["label"]] != "ChatGPT":
        return 1 - res["score"]
    return res["score"]


def predict_zh(text: str) -> List:
    id2label = ["人类", "ChatGPT"]
    res = predict_func(text, tokenizer_zh, model_zh)
    if id2label[res["label"]] != "ChatGPT":
        return 1 - res["score"]
    return res["score"]


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/v2/predict_zh/")
def create_item(sentence: Sentence):
    PTM_prob = predict_zh(sentence.data)
    return {
        "PTM_prob": PTM_prob,
    }  # >0.5 means the content is create by ChatGPT

if enable_en:
    @app.post("/v2/predict_en/")
    def create_item(sentence: Sentence):
        PTM_prob = predict_en(sentence.data)
        return {
            "PTM_prob": PTM_prob,
        }  # >0.5 means the content is create by ChatGPT


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=6002)
