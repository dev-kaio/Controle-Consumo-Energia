// ============================================================================
// REFERÊNCIA — mapa de registradores Modbus do medidor
// ============================================================================
// O firmware atual (esp.cpp) usa só
// alguns destes endereços; este arquivo fica como documentação do mapa completo
// do medidor, pra quando precisar de tensão por fase, energia gerada, etc.
//
// NÃO é incluído por esp.cpp — é referência. Os endereços que o esp.cpp usa hoje
// estão espelhados lá em REG_CORRENTE / REG_POTENCIA / REG_ENERGIA.
//
// Cada grandeza ocupa 2 registradores (float32, high word primeiro).
// Confirmar contra o datasheet do medidor real antes de campo.
// ============================================================================

#include <Arduino.h>
#include <ModbusMaster.h>
#include <SoftwareSerial.h>
#include <WiFi.h>

int led1 = 23;
int led2 = 21;

unsigned long currentMillis;
unsigned long previousMillis = 0;

int tempo = 10000; //valor do tempo entre os envios de dados

//Dados que serão lidos pelo medidor 1:
float v11; //tensão 1 - 0/0x0000
float v12; //tensão 2 - 2/0x0002
float v13; //tensão 3 - 4/0x0004
float a11; //corrente 1 - 6/0x0006
float a12; //corrente 2 - 8/0x0008
float a13; //corrente 3 - 10/0x000A
float w11; //potencia 1 (630) / (120M é a potencia ativa) - 12/0x000C
float w12; //potencia 2 (630) - 14/0x000E
float w13; //potencia 3 (630) - 16/0x0010
float etc1; //energia total consumida - 72/0x0048
float etg1; //energia total gerada (630) - 74/0x004A
