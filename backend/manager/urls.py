from django.urls import path
from . import views

urlpatterns = [
    path('login', views.user_login, name='user-login'),
    path('logout', views.user_logout, name='user-logout'),
    path('login/employee-login', views.employee_login, name='employee-login'),
    path('login/manager-login', views.manager_login, name='manager-login'),

    path('authenticate/<uidb64>/<token>', views.authenticate_user, name='authenticate'),

    path('reset-password', views.reset_password, name='reset-password'),
    path('reset/<uidb64>/<token>', views.password_reset, name='reset'),
    path("new-password/<int:user_id>", views.new_password, name="new-password"),

    path('change-email/<uidb64>/<token>', views.change_email, name='change-email'),
    path('change-backup-email/<uidb64>/<token>', views.change_backup_email, name='change-backup-email'),
    path("verify-email-address/<int:user_id>", views.verify_email_address, name="verify-email-address"),
    path("verify-backup-email-address/<int:user_id>", views.verify_backup_email_address, name="verify-backup-email-address"),

    path("change-email-address/<uidb64>/<uemail64>/<token>", views.change_email_address, name="change-email-address"),
    path("change-backup-email-address/<uidb64>/<uemail64>/<token>", views.change_backup_email_address, name="change-backup-email-address"),
    path('reset-email', views.reset_email, name='reset-email'),
    path('verify-email/<uidb64>/<token>', views.verify_email_reset, name='verify-email-reset'),
    path('verify-email-backup/<uidb64>/<token>', views.new_email_verification_and_email_changing , name='verify-email-backup'),

    path('<str:business_name>/vehicles', views.vehicles, name='vehicles'),
    path('<str:business_name>/add-new-vehicle', views.add_new_vehicle, name='add-new-vehicle'),

    path('<str:business_name>/business-settings', views.business_settings, name='business-settings'),
    path('<str:business_name>/users-management', views.users_management, name='users-management'),

    path('get-models/', views.get_manufacturer_models, name='get-models'),
    path('<str:business_name>/get-vehicle-models/', views.get_vehicle_models, name='get-vehicle-models'),
    path('<str:business_name>/get-subcategories/', views.get_subcategories, name='get-subcategories'),

    path('<str:business_name>/<int:vehicle_internal_id>/vehicle-details', views.vehicle_details, name='vehicle-details'),
    path('<str:business_name>/<int:vehicle_internal_id>/delete-vehicle', views.delete_vehicle, name='delete-vehicle'),
    path('<str:business_name>/<int:vehicle_internal_id>/activate-vehicle', views.activate_vehicle, name='activate-vehicle'),
    path('<str:business_name>/<int:vehicle_internal_id>/generate-sale-contract', views.generate_vehicle_sale_contract_pdf, name='generate-sale-contract'),
    path('<str:business_name>/<int:vehicle_internal_id>/generate-buy-contract', views.generate_vehicle_buy_contract_pdf, name='generate-buy-contract'),
    path('<str:business_name>/<int:vehicle_internal_id>/generate-identity-check-pdf', views.generate_identity_check_pdf, name='generate-identity-check-pdf'),
    path('<str:business_name>/<int:vehicle_internal_id>/generate-binding-order-pdf', views.generate_binding_order_pdf, name='generate-binding-order-pdf'),
    path('<str:business_name>/<int:vehicle_internal_id>/generate-sale-agreement-pdf', views.generate_sale_agreement_pdf, name='generate-sale-agreement-pdf'),
    path('<str:business_name>/<int:vehicle_internal_id>/generate-receipt-verkaufvertrag-pdf', views.generate_receipt_verkaufvertrag_pdf, name='generate-receipt-verkaufvertrag-pdf'),
    path('<str:business_name>/<int:vehicle_internal_id>/change-status', views.change_vehicle_status, name='change-vehicle-status'),

    path('<str:business_name>/add-legal-entity', views.add_legal_entity, name='add-legal-entity'),

    path('<str:business_name>/transactions', views.transactions, name='transactions'),
    path('<str:business_name>/add-new-transaction', views.add_new_transaction, name='add-new-transaction'),

    path('<str:business_name>/<int:transaction_internal_id>/transaction-details', views.transaction_details, name='transaction-details'),
    path('<str:business_name>/<int:transaction_internal_id>/delete-transaction', views.delete_transaction, name='delete-transaction'),
    path('<str:business_name>/<int:transaction_internal_id>/activate-transaction', views.activate_transaction, name='activate-transaction'),
    path('<str:business_name>/<int:transaction_internal_id>/generate-transaction_pdf', views.generate_transaction_pdf, name='generate-transaction-pdf'),

    # Legal Entity Management
    path('<str:business_name>/legal-entities', views.legal_entities, name='legal-entities'),
    path('<str:business_name>/add-new-legal-entity', views.add_new_legal_entity, name='add-new-legal-entity'),
    path('<str:business_name>/<int:legal_entity_internal_id>/legal-entity-details', views.legal_entity_details, name='legal-entity-details'),
    path('<str:business_name>/<int:legal_entity_internal_id>/delete-legal-entity', views.delete_legal_entity, name='delete-legal-entity'),
    path('<str:business_name>/<int:legal_entity_internal_id>/activate-legal-entity', views.activate_legal_entity, name='activate-legal-entity'),

    # Dynamic Choice AJAX endpoints
    path('<str:business_name>/add-choice/', views.add_dynamic_choice, name='add-dynamic-choice'),
    path('<str:business_name>/deactivate-choice/', views.deactivate_choice, name='deactivate-choice'),
    path('<str:business_name>/reactivate-choice/', views.reactivate_choice, name='reactivate-choice'),
    
    # Manage Choices page
    path('<str:business_name>/manage-choices', views.manage_choices, name='manage-choices'),

]