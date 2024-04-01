import { PageContainer } from '@ant-design/pro-components';
import { Avatar, Button, Card, Flex, Progress, Row, Space, Popover, Typography, message } from 'antd';
import TextArea from 'antd/es/input/TextArea';
const { Title, Paragraph, Text } = Typography;
import React, { useState } from 'react';

const Welcome: React.FC = () => {
  const [data, setData] = useState<string>("");
  const [Do, setDo] = useState(false);
  const [load, setLoad] = useState(false);
  const [datas, setDatas] = useState<predictData[]>([]);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const colorBar = ['#C90B21','#D4262A','#DE3934','#E74A3E','#EF5B4A','#F56B56','#FA7C63','#FD8C72','#FE9D81','#FEAE91']
  const [value, setValue] = React.useState<string>('horizontal');
  const baseStyle: React.CSSProperties = {
    width: '25%',
    height: 30,
  };

  interface predictData {
    text : string,
    value : number,
    values : number[],
  }

  const getData = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setData(e.target.value);
  };

  function splitTextToSentences(text_: string[]): string[] {
    const signals = ['.', '?', '!', '。', '？', '！']
    let text = text_;
    signals.forEach((signal) => {
      var result_:string[] = [];
      text.forEach((s) => {
        s = s.trimEnd();    //去除末尾空格
        let result = s.split(signal)
        let end:string = result.pop()!;     //暂存结尾
        result = result.map(item => item + signal)
        if(end != ''){result.push(end)}
        result_ = result_.concat(result);
      })
      text = result_;
    })

    return text;
  }

  const predict = async (text:string) => {
    var data1:number=0,data2:number=0,data3:number=0;

    //await fetch('https://ccd_v1.xiebin.me/v1/predict_zh/', {
      await fetch('http://127.0.0.1:6001/v1/predict_zh/', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "data": text
      })
      
    })
    .then(response => response.json())
    .then(data => {data1=data.GLTR_prob;data2=data.PPL_prob})
    .catch(error => console.error(error));

    //await fetch('https://ccd_v2.xiebin.me/v2/predict_zh/', {
      await fetch('http://127.0.0.1:6002/v2/predict_zh/', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "data": text
      })
      
    })
    .then(response => response.json())
    .then(data => {data3=data.PTM_prob})
    .catch(error => console.error(error));

    return [data1, data2 ,data3];
  }

  const click = async () => {
    var texts = splitTextToSentences([data]);
    if(!data){message.error("请输入文本!");return;}
    setLoad(true)
    setDo(true)

    var predictDatas : predictData[] = [];
    const l = texts.length;
    for (let i = 0;i < l; i++){
      const d:predictData = {
        text : texts[i],
        value : 0,
        values : [],
      }
      var value = await predict(texts[i]);
      d.values = value;
      d.value = (d.values[0]+d.values[1]+d.values[2])/3
      predictDatas.push(d);
      if (i==l-1){
        setLoad(false)
        setDatas(predictDatas);
        setDone(true)
      }
      setProgress((i+1)/l*100)
    }
    
  }

  const getColor = (value:number) => {
    if (value < 0.5){return '#FFFFFF'}
    return colorBar[9-Math.floor((value-0.5+0.05)*20)]
  }

  return (
    <PageContainer>
    <Row typeof="flex" justify="center" align="middle">
      <Card style={{ width: 510, marginTop: 16 }}>
        <Row typeof="flex" justify="center" align="top">
          <Avatar size={40} src="https://oss.xiebin.me/raw/tmp/AIthentiCat.png" />
          <Title level={2}>AIthentiCat</Title>
        </Row>
        <Flex vertical={value === 'vertical'}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{ ...baseStyle, backgroundColor: colorBar[9-i] }} />
          ))}
        </Flex>
        <div style={{display : 'flex', justifyContent : 'space-between'}}> <span>Boundary</span> <span>ChatGPT</span> </div><Space direction="vertical" size="large" style={{ display: 'flex' }}>
          {!Do && <TextArea rows={10} allowClear onChange={getData} value={data} placeholder='输入文本'/>}
          {Do && 
            <Card loading={load}>
              <Paragraph>
                {done &&  datas.map((data) => (
                  <Text title={'GLTR_prob:    '+data.values[0].toString()+'\nPPL_prob:    '+data.values[1].toString()+'\nPTM_prob:    '+data.values[2].toString()+'\nAVG:    '+data.value.toString()} style={{backgroundColor : getColor(data.value)}}>{data.text}</Text>
                ))}
              </Paragraph>
              
            </Card>}
          {Do && <Progress percent={progress} showInfo={false}/>}
          <Row typeof="flex" justify="center" align="middle">
            <Space size={50} style={{ display: 'flex' }}>
              <Button type='primary' onClick={() => {click();setProgress(0)}}>检测</Button>
              <Button type='primary' danger onClick={() => {setData("");setDo(false);setDatas([])}}>清空</Button>
            </Space>
          </Row>
        </Space>
      </Card>
    </Row>
    </PageContainer> 
  );
};

export default Welcome;