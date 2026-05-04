// src/main/java/com/assistwalk/exception/ResourceNotFoundException.java
package com.assistwalk.exception;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}