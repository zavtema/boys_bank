package com.example.bank.admin.controller;

import com.example.bank.admin.dto.AdminAnalyticsResponse;
import com.example.bank.admin.dto.UpdateRoleRequest;
import com.example.bank.admin.service.AdminAnalyticsService;
import com.example.bank.customer.dto.RegisterRequest;
import com.example.bank.customer.dto.UserResponse;
import com.example.bank.customer.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final CustomerService customerService;
    private final AdminAnalyticsService adminAnalyticsService;

    @GetMapping
    public List<UserResponse> users() {
        return customerService.users();
    }

    @GetMapping("/{id}")
    public UserResponse user(@PathVariable Long id) {
        return customerService.user(id);
    }

    @GetMapping("/analytics")
    public AdminAnalyticsResponse analytics() {
        return adminAnalyticsService.analytics();
    }

    @PostMapping("/admins")
    public UserResponse createAdmin(@Valid @RequestBody RegisterRequest request) {
        return customerService.createAdmin(request);
    }

    @PatchMapping("/{id}/role")
    public UserResponse role(@PathVariable Long id, @Valid @RequestBody UpdateRoleRequest request, Authentication authentication) {
        return customerService.updateRole(id, request.role(), authentication.getName());
    }
}
