package com.assistwalk.exception;

public class OcrServiceUnavailableException extends RuntimeException {
    public OcrServiceUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}